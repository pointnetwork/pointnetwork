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

    async deploy(deployPath) {
        try {
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
                    await this.deployContract(target, contractName, fileName, deployPath);
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
            if (deployConfig.react === true) {
                const routesByFile = {}

                for (const route in routes) {
                    const filename = routes[route]
                    if (!routesByFile[filename]) {
                        routesByFile[filename] = []
                    }
                    routesByFile[filename].push(route)
                }

                const fileTree = [{dirs: []}]

                while (fileTree.length) {
                    const {dirs} = fileTree.pop()
                    const files = fs.readdirSync(path.join(deployPath, 'views', ...dirs))

                    for (const fileName of files) {
                        const fileExt = path.extname(fileName)
                        const relativePath = dirs.concat(fileName)
                        const absolutePath = path.join(deployPath, 'views', ...relativePath)

                        if (fs.lstatSync(absolutePath).isDirectory()) {
                            fileTree.push({dirs: relativePath})
                            continue
                        }


                        const blob = fs.readFileSync(absolutePath)
                        const cacheFilePath = path.join(this.getCacheDir(), this.ctx.utils.hashFnHex(blob))

                        fs.writeFileSync(cacheFilePath, blob)

                        const uploaded = await this.ctx.client.storage.putFile(cacheFilePath)

                        this.cache_uploaded[cacheFilePath] = uploaded.id;
                        this.ctx.client.deployerProgress.update(cacheFilePath, 100, `uploaded::${uploaded.id}`)

                        const contentPath = relativePath.join('/')
                        const routePaths = routesByFile[contentPath] || [`/${contentPath}`]
                        for (const routePath of routePaths) {
                            routes[routePath] = `${uploaded.id}${fileExt}`
                        }
                    }
                }
            } else {
                for (let k in routes) {
                    if (routes.hasOwnProperty(k)) {
                        let v = routes[k];

                        let templateFileName = path.join(deployPath, 'views', v);
                        const hash = await this.processTemplate(templateFileName, deployPath, deployConfig);
                        routes[k] = hash;
                    }
                }
            }

        // Upload public - root dir
        console.log('uploading root directory...');
        let publicDirectory = await this.ctx.client.storage.putDirectory(path.join(deployPath, 'public')); // todo: and more options
        let publicDirId = publicDirectory.id;
        await this.updateKeyValue(target, {'::rootDir': publicDirId}, deployPath);


        // Upload routes
        let routesFilePath = path.join(deployPath, 'routes.json');
        let routesFile = fs.readFileSync(routesFilePath, 'utf-8');
        let routes = JSON.parse(routesFile);

            console.log('uploading route file...', {routes});
            const tmpRoutesFilePath = path.join(this.getCacheDir(), this.ctx.utils.hashFnHex(JSON.stringify(routes)));
            fs.writeFileSync(tmpRoutesFilePath, JSON.stringify(routes));
            this.ctx.client.deployerProgress.update(routesFilePath, 0, 'uploading')
            let routeFileUploaded = await this.ctx.client.storage.putFile(tmpRoutesFilePath); // todo: and more options
            this.ctx.client.deployerProgress.update(routesFilePath, 100, `uploaded::${routeFileUploaded.id}`)
            await this.updateZDNS(target, routeFileUploaded.id);
            await this.updateKeyValue(target, deployConfig.keyvalue, deployPath, deployConfig);

            console.log('Deploy finished');

        } catch (e) {
            console.error('Deploy error:', e)
            throw e
        }
    }

    static async getPragmaVersion(source){
        let regex = /pragma solidity [\^\~\>\<]?=?(?<version>[0-9\.]*);/;
        let found = null
        if (found = source.match(regex)) {
            return found.groups.version
        } else {
            throw new Error('Contract has no compiler version')
        }
    }


    async deployContract(target, contractName, fileName, deployPath) {
        this.ctx.client.deployerProgress.update(fileName, 0, 'compiling')
        const fs = require('fs-extra');

        const contractSource = fs.readFileSync(fileName, 'utf8');

        const version = await this.constructor.getPragmaVersion(contractSource);
        const versionArray = version.split('.');
        let SOLC_MAJOR_VERSION = versionArray[0]
        let SOLC_MINOR_VERSION = versionArray[1]
        let SOLC_FULL_VERSION = `solc${SOLC_MAJOR_VERSION}_${SOLC_MINOR_VERSION}`

        const path = require('path');
        const solc = require(SOLC_FULL_VERSION);


        const compileConfig = {
            language: 'Solidity',
            sources: {
                [contractName+'.sol']: {
                    content: contractSource
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
            const dependencyLocalPath = path.join(deployPath, 'contracts', dependency)
            const dependencyNodeModulesPath = path.join(deployPath, 'src/node_modules/', dependency)
            if (fs.existsSync(dependencyLocalPath)) {
                return {contents: fs.readFileSync(dependencyLocalPath, 'utf8')};
            } else if (fs.existsSync(dependencyNodeModulesPath)){
                return {contents: fs.readFileSync(dependencyNodeModulesPath, 'utf8')};
            } else {
                throw new Error('Could not find contract dependency, have you tried npm install?')
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
            const fileName = contractFileName.split('\\').pop().split('/').pop()
            const _contractName = fileName.replace('.sol', '');
            if (contractName === _contractName) {
                artifacts = compiledSources.contracts[contractFileName][_contractName];
            }
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

    async storagePut(content) {
        const cache_dir = path.join(this.ctx.datadir, this.config.cache_path);
        this.ctx.utils.makeSurePathExists(cache_dir);
        const tmpPostDataFilePath = path.join(cache_dir, this.ctx.utils.hashFnHex(content));
        fs.writeFileSync(tmpPostDataFilePath, content);
        let uploaded = await this.ctx.client.storage.putFile(tmpPostDataFilePath);
        return uploaded.id;
    }

    async updateKeyValue (target, values, deployPath, deployConfig) {

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

                        const file = path.join (deployPath, 'public', value.file)

                        if (!fs.existsSync (file)) {
                            throw new Error ('File not found: ' + file)
                        }

                        const ext = value.file.replace (/.*\.([a-zA-Z0-9]+)$/, '$1')
                        const cid = (await this.ctx.client.storage.putFile (file)).id;

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
                    if (value.metadata){
                        const metadataHash = await this.storagePut(JSON.stringify(value.metadata))
                        value.metadata['metadataHash'] = metadataHash
                        for(let paramName of paramNames) {
                            params.push(value.metadata[paramName]);
                        }
                    } else {
                        for(let paramName of paramNames) {
                            params.push(value[paramName]);
                        }
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