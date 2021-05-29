const path = require('path');
const fs = require('fs');
const _ = require('lodash');

class Deployer {
    constructor(ctx) {
        this.ctx = ctx;
        this.config = this.ctx.config.deployer;
        this.cache_uploaded = {};
    }

    async start() {
        // todo
    }

    getCacheDir() {
        const cache_dir = path.join(this.ctx.datadir, this.config.cache_path);
        this.ctx.utils.makeSurePathExists(cache_dir);
        return cache_dir;
    }

    // todo: beware of infinite recursion!
    async processTemplate(fileName, deployPath) {
        if (fileName in this.cache_uploaded) return this.cache_uploaded[ fileName ];

        this.ctx.client.deployerProgress.update(fileName, 0, 'processing_template')

        console.log('uploading '+fileName+'...');

        let tmpTemplate, template;

        if (fileName.split('.').slice(-1)[0] !== "zhtml") {
            // don't parse
            template = fs.readFileSync(fileName, { encoding: null });

            console.log('skipping template parser for', fileName, 'hash', this.ctx.utils.hashFnHex(template));

            tmpTemplate = path.join(this.getCacheDir(), this.ctx.utils.hashFnHex(template));
            fs.writeFileSync(tmpTemplate, template, { encoding: null });

        } else {
            console.log('parsing template', fileName);

            // do parse
            template = fs.readFileSync(fileName, 'utf-8');

            /////

            const reg = /{% extends ['"](.*?)['"] %}/g;
            let result;
            while((result = reg.exec(template)) !== null) { // todo: what if it's already a hash? // todo: what if it's https:// or something? // todo: what if it's /_storage/<hash>?
                if (result[1].startsWith('http://') || result[1].startsWith('https://')) {
                    template = template;
                } else {
                    const fl = path.join(deployPath, 'views', result[1]);
                    if (!fs.existsSync(fl)) {
                        console.error('Warning: Mentioned file '+result[1]+' ('+fl+') not found!');
                    }//throw new Error('Warning: Mentioned file '+result[1]+' ('+fl+') not found!'); // todo: +stack etc. // todo: make it a warning?

                    const hash = await this.processTemplate(fl, deployPath); // todo: parallelize
                    template = template.replace(result[1], hash); // todo: replace using outer stuff as well
                }
            }
            ///

            // todo: dont parse html with regex!1 you'll go to hell for that! or worse, Turbo Pascal coding bootcamp!
            const regs = [
                /\<link[^\>]*?href=['"](.*?)['"]/g,
                /\<script[^\>]*?src=['"](.*?)['"]/g,
                /\<img[^\>]*?src=['"](.*?)['"]/g,
                /\<body[^\>]*?background=['"](.*?)['"]/g,
                /\<table[^\>]*?background=['"](.*?)['"]/g,
            ];
            for(let reg of regs) {
                while((result = reg.exec(template)) !== null) { // todo: what if it's already a hash? // todo: what if it's https:// or something? // todo: what if it's /_storage/<hash>?
                    if (result[1].startsWith('https://')) { continue }
                    const fl = path.join(deployPath, 'views', result[1]);
                    if (!fs.existsSync(fl)) throw new Error('Mentioned file '+result[1]+' ('+fl+') not found!'); // todo: +stack etc. // todo: make it a warning?

                    let ext = /(?:\.([^.]+))?$/.exec(result[1])[1];

                    const hash = await this.processTemplate(fl, deployPath); // todo: parallelize
                    template = template.replace(result[1], '/_storage/'+hash+'.'+ext); // todo: replace using outer stuff as well
                }
            }

            tmpTemplate = path.join(this.getCacheDir(), this.ctx.utils.hashFnHex(template));
            fs.writeFileSync(tmpTemplate, template, 'utf-8');
        }

        const uploaded = await this.ctx.client.storage.putFile(tmpTemplate); // todo: and more options

        this.cache_uploaded[ fileName ] = uploaded.id;

        this.ctx.client.deployerProgress.update(fileName, 100, `uploaded::${uploaded.id}`)

        return uploaded.id;
    }

    async deploy(deployPath) {

        // todo: error handling, as usual
        let deployConfigFilePath = path.join(deployPath, 'point.deploy.json');
        let deployConfigFile = fs.readFileSync(deployConfigFilePath, 'utf-8');
        let deployConfig = JSON.parse(deployConfigFile);

        // assert(deployConfig.version === 1); // todo: msg

        let target = deployConfig.target;

        // Deploy contracts
        let contractNames = deployConfig.contracts;
        if (!contractNames) contractNames = [];
        for(let contractName of contractNames) {
            let fileName = path.join(deployPath, 'contracts', contractName+'.sol');
            try {
                await this.deployContract(target, contractName, fileName);
            } catch(e) {
                this.ctx.log.error(e);
                throw e;
            }
        }

        let routesFilePath = path.join(deployPath, 'routes.json');
        let routesFile = fs.readFileSync(routesFilePath, 'utf-8');
        let routes = JSON.parse(routesFile);

        //let uploadFiles
        //let parseFiles = // todo: should be queue

        for (let k in routes) {
            if (routes.hasOwnProperty(k)) {
                let v = routes[k];

                let templateFileName = path.join(deployPath, 'views', v);
                const hash = await this.processTemplate(templateFileName, deployPath);
                routes[k] = hash;
            }
        }

        console.log('uploading route file...');
        const tmpRoutesFilePath = path.join(this.getCacheDir(), this.ctx.utils.hashFnHex(JSON.stringify(routes)));
        fs.writeFileSync(tmpRoutesFilePath, JSON.stringify(routes));
        this.ctx.client.deployerProgress.update(routesFilePath, 0, 'uploading')
        let routeFileUploaded = await this.ctx.client.storage.putFile(tmpRoutesFilePath); // todo: and more options
        this.ctx.client.deployerProgress.update(routesFilePath, 100, `uploaded::${routeFileUploaded.id}`)
        await this.updateZDNS(target, routeFileUploaded.id);

        await this.updateKeyValue(target, deployConfig.keyvalue, deployPath);

        console.log('Deploy finished');
    }

    async deployContract(target, contractName, fileName) {
        this.ctx.client.deployerProgress.update(fileName, 0, 'compiling')

        const path = require('path');
        const solc = require('solc');
        const fs = require('fs-extra');

        const compileConfig = {
            language: 'Solidity',
            sources: {
                [contractName+'.sol']: {
                    content: fs.readFileSync(fileName, 'utf8')
                },
            },
            settings: {
                outputSelection: { // return everything
                    '*': {
                        '*': ['*']
                    }
                }
            }
        };

        let getImports = function(dependency) {
            switch (dependency) {
                case contractName+'.sol':
                    return {contents: fs.readFileSync(fileName, 'utf8')};
                default:
                    return {error: 'File not found'}
            }
        };

        let compiledSources = JSON.parse(solc.compile(JSON.stringify(compileConfig), { import: getImports }));
        this.ctx.client.deployerProgress.update(fileName, 20, 'compiled')

        if (!compiledSources) {
            throw new Error(">>>>>>>>>>>>>>>>>>>>>>>> SOLIDITY COMPILATION ERRORS <<<<<<<<<<<<<<<<<<<<<<<<\nNO OUTPUT");
        } else if (compiledSources.errors) {
            let found = false;
            let msg = '';
            for(let e of compiledSources.errors) {
                if (e.severity === 'warning') {
                    console.warn(e);
                    continue;
                }
                found = true;
                msg += e.formattedMessage + "\n"
            }
            msg = ">>>>>>>>>>>>>>>>>>>>>>>> SOLIDITY COMPILATION ERRORS <<<<<<<<<<<<<<<<<<<<<<<<\n" + msg;
            if (found) throw new Error(msg);
        }

        let artifacts;
        for (let contractFileName in compiledSources.contracts) {
            const _contractName = contractFileName.replace('.sol', '');
            artifacts = compiledSources.contracts[contractFileName][_contractName];
        }

        const truffleContract = require('@truffle/contract');
        const contract = truffleContract(artifacts);
        contract.setProvider(this.ctx.web3.currentProvider);

        let gasPrice = await this.ctx.web3.eth.getGasPrice();
        let estimateGas = Math.floor(await contract.new.estimateGas() * 1.1);
        let deployedContractInstance = await contract.new({ from: this.ctx.web3.eth.defaultAccount, gasPrice, gas: estimateGas });
        let address = deployedContractInstance.address;

        console.log('Deployed Contract Instance of '+contractName, address);
        this.ctx.client.deployerProgress.update(fileName, 40, 'deployed')

        const artifactsJSON = JSON.stringify(artifacts);
        const tmpFilePath = path.join(this.getCacheDir(), this.ctx.utils.hashFnHex(artifactsJSON));
        fs.writeFileSync(tmpFilePath, artifactsJSON);

        this.ctx.client.deployerProgress.update(fileName, 60, 'saving_artifacts')
        let artifacts_storage_id = (await this.ctx.client.storage.putFile(tmpFilePath)).id;

        this.ctx.client.deployerProgress.update(fileName, 80, `updating_zweb_contracts`)
        await this.ctx.web3bridge.putKeyValue(target, 'zweb/contracts/address/'+contractName, address);
        await this.ctx.web3bridge.putKeyValue(target, 'zweb/contracts/abi/'+contractName, artifacts_storage_id);

        this.ctx.client.deployerProgress.update(fileName, 100, `uploaded::${artifacts_storage_id}`)

        console.log(`Contract ${contractName} with Artifacts Storage ID ${artifacts_storage_id} is deployed to ${address}`);
    };

    async updateZDNS(host, id) {
        let target = host.replace('.z', '');
        console.log('Updating ZDNS', {target, id});
        await this.ctx.web3bridge.putZRecord(target, '0x'+id);
    }

    async updateKeyValue (target, values, deployPath) {

        const replaceContentsWithCids = async obj => {

            const result = {}

            for (let [key, value] of Object.entries (obj)) {

                if (/^storage\[[^\]]+\]$/.test (key)) {

                    key = key.replace (/.*storage\[([^\]]+)\].*/, '$1')

                    if ('blob' in value) {

                        const tmpFilePath = path.join (
                            this.getCacheDir (),
                            this.ctx.utils.hashFnHex (value.blob)
                        )

                        fs.writeFileSync (tmpFilePath, String (value.blob))
                        const uploaded = await this.ctx.client.storage.putFile (tmpFilePath)

                        value = uploaded.id

                    } else if ('file' in value) {

                        const file = path.join (deployPath, 'views', value.file)

                        if (!fs.existsSync (file)) {
                            throw new Error ('File not found: ' + file)
                        }

                        const ext = value.file.replace (/.*\.([a-zA-Z0-9]+)$/, '$1')
                        const cid = await this.processTemplate (file, deployPath)

                        value = '/_storage/' + cid + '.' + ext

                    } else {

                        throw new Error ('Storage resource not specified: ' + JSON.stringify (value))
                    }

                } else if (typeof value === 'object') {

                    value = await replaceContentsWithCids (value)

                } else if (Array.isArray (value)) {

                    for (let i in value) {

                        if (typeof value[i] === 'object') {

                            value[i] = await replaceContentsWithCids (value[i])
                        }
                    }
                }

                result[key] = value
            }

            return result
        }

        values = await replaceContentsWithCids(values)

        for (let [key, value] of Object.entries(values)) {
            if (value && (Array.isArray(value) || typeof value === 'object')) {
                // if there is a contract_send in the value then send data to the specified contract
                if('contract_send' in value) {
                    let [contractName, methodNameAndParams] = value.contract_send.split('.')
                    let [methodName, paramsTogether] = methodNameAndParams.split('(')
                    paramsTogether = paramsTogether.replace(')', '')
                    let paramNames = paramsTogether.split(',')
                    let params = [];
                    for(let paramName of paramNames) {
                        params.push(value[paramName]);
                    }
                    await this.ctx.web3bridge.sendContract(target, contractName, methodName, params );
                }
                value = JSON.stringify(value)
            }
            await this.ctx.web3bridge.putKeyValue(target, key, String(value))
        }
    }
}

module.exports = Deployer;