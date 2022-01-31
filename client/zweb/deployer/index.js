const path = require('path');
const fs = require('fs');
const utils = require('#utils');
const ethUtil = require('ethereumjs-util');

class Deployer {
    constructor(ctx) {
        this.ctx = ctx;
        this.config = this.ctx.config.deployer;
        this.cache_uploaded = {}; // todo: unused? either remove or use
    }

    async start() {
        // todo
    }

    getCacheDir() {
        const cache_dir = path.join(this.ctx.datadir, this.config.cache_path);
        utils.makeSurePathExists(cache_dir);
        return cache_dir;
    }

    async migrate(site) {
        const privateKeyHex = this.ctx.wallet.getNetworkAccountPrivateKey();
        const privateKey = Buffer.from(privateKeyHex, 'hex');
        const publicKey = ethUtil.privateToPublic(privateKey);
        

        console.log(privateKeyHex);
        console.log(privateKey);
        console.log(publicKey);
    }

    async deploy(deployPath, deployContracts = false, dev = false) {
        // todo: error handling, as usual
        let deployConfigFilePath = path.join(deployPath, 'point.deploy.json');
        let deployConfigFile = fs.readFileSync(deployConfigFilePath, 'utf-8');
        let deployConfig = JSON.parse(deployConfigFile);

        // assert(deployConfig.version === 1); // todo: msg

        const target = dev ? `${deployConfig.target.replace('.z','dev')}.z`: deployConfig.target;
        const identity = target.replace(/\.z$/, '');
        const {defaultAccount: owner} = this.ctx.web3.eth;

        const registeredOwner = await this.ctx.web3bridge.ownerByIdentity(identity);
        const identityIsRegistered = registeredOwner && registeredOwner !== '0x0000000000000000000000000000000000000000';

        if (identityIsRegistered && registeredOwner !== owner) {
            this.ctx.log.error({identity, registeredOwner, owner}, 'Identity is already registered');
            throw new Error(`Identity ${identity} is already registered, please choose a new one and try again`);
        }

        if (!identityIsRegistered) {
            const privateKeyHex = this.ctx.wallet.getNetworkAccountPrivateKey();
            const privateKey = Buffer.from(privateKeyHex, 'hex');
            const publicKey = ethUtil.privateToPublic(privateKey);

            this.ctx.log.info({
                identity,
                owner,
                publicKey: publicKey.toString('hex'),
                len: Buffer.byteLength(publicKey, 'utf-8'),
                parts: [
                    `0x${publicKey.slice(0, 32).toString('hex')}`,
                    `0x${publicKey.slice(32).toString('hex')}`
                ]}, 'Registring new identity');
                
            await this.ctx.web3bridge.registerIdentity(identity, owner, publicKey);

            this.ctx.log.info({identity, owner, publicKey}, 'Successfully registered new identity');
        }

        // Deploy contracts
        if (deployContracts) {
            let contractNames = deployConfig.contracts;
            if (!contractNames) contractNames = [];
            for(let contractName of contractNames) {
                let fileName = path.join(deployPath, 'contracts', contractName+'.sol');
                try {
                    await this.deployContract(target, contractName, fileName, deployPath);
                } catch(e) {
                    this.ctx.log.error({
                        message: e.message,
                        stack: e.stack
                    }, 'Zapp contract deployment error');
                    throw e;
                }
            }
        }

        // Upload public - root dir
        console.log('uploading root directory...');
        let publicDirectory = await this.ctx.client.storage.putDirectory(path.join(deployPath, 'public')); // todo: and more options
        let publicDirId = publicDirectory.id;
        await this.updateKeyValue(target, {'::rootDir': publicDirId}, deployPath, deployContracts);

        // Upload routes
        let routesFilePath = path.join(deployPath, 'routes.json');
        let routesFile = fs.readFileSync(routesFilePath, 'utf-8');
        let routes = JSON.parse(routesFile);

        console.log('uploading route file...', {routes});
        const tmpRoutesFilePath = path.join(this.getCacheDir(), utils.hashFnUtf8Hex(JSON.stringify(routes)));
        fs.writeFileSync(tmpRoutesFilePath, JSON.stringify(routes));
        this.ctx.client.deployerProgress.update(routesFilePath, 0, 'uploading');
        let routeFileUploaded = await this.ctx.client.storage.putFile(tmpRoutesFilePath); // todo: and more options
        this.ctx.client.deployerProgress.update(routesFilePath, 100, `uploaded::${routeFileUploaded.id}`);
        await this.updateZDNS(target, routeFileUploaded.id);

        await this.updateKeyValue(target, deployConfig.keyvalue, deployPath, deployContracts);

        console.log('Deploy finished');
    }

    static async getPragmaVersion(source){
        let regex = /pragma solidity [\^~><]?=?(?<version>[0-9.]*);/;
        let found = source.match(regex);
        if (found) {
            return found.groups.version;
        } else {
            throw new Error('Contract has no compiler version');
        }
    }

    async deployContract(target, contractName, fileName, deployPath) {
        this.ctx.client.deployerProgress.update(fileName, 0, 'compiling');
        const fs = require('fs-extra');

        const contractSource = fs.readFileSync(fileName, 'utf8');

        const version = await Deployer.getPragmaVersion(contractSource);
        const versionArray = version.split('.');
        let SOLC_MAJOR_VERSION = versionArray[0];
        let SOLC_MINOR_VERSION = versionArray[1];
        let SOLC_FULL_VERSION = `solc${SOLC_MAJOR_VERSION}_${SOLC_MINOR_VERSION}`;

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
            const dependencyOriginalPath = path.join(deployPath, 'contracts', dependency);
            const dependencyNodeModulesPath = path.join(deployPath, 'node_modules/', dependency);
            if (fs.existsSync(dependencyOriginalPath)) {
                return {contents: fs.readFileSync(dependencyOriginalPath, 'utf8')};
            } else if (fs.existsSync(dependencyNodeModulesPath)){
                return {contents: fs.readFileSync(dependencyNodeModulesPath, 'utf8')};
            } else {
                throw new Error('Could not find contract dependency, have you tried npm install?');
            }
        };

        let compiledSources = JSON.parse(solc.compile(JSON.stringify(compileConfig), { import: getImports }));
        this.ctx.client.deployerProgress.update(fileName, 20, 'compiled');
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
                msg += e.formattedMessage + "\n";
            }
            msg = ">>>>>>>>>>>>>>>>>>>>>>>> SOLIDITY COMPILATION ERRORS <<<<<<<<<<<<<<<<<<<<<<<<\n" + msg;
            if (found) throw new Error(msg);
        }

        let artifacts;
        for (let contractFileName in compiledSources.contracts) {
            const fileName = contractFileName.split('\\').pop().split('/').pop();
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
        this.ctx.client.deployerProgress.update(fileName, 40, 'deployed');

        const artifactsJSON = JSON.stringify(artifacts);
        const tmpFilePath = path.join(this.getCacheDir(), utils.hashFnUtf8Hex(artifactsJSON));
        fs.writeFileSync(tmpFilePath, artifactsJSON);

        this.ctx.client.deployerProgress.update(fileName, 60, 'saving_artifacts');
        let artifacts_storage_id = (await this.ctx.client.storage.putFile(tmpFilePath)).id;

        this.ctx.client.deployerProgress.update(fileName, 80, `updating_zweb_contracts`);
        await this.ctx.web3bridge.putKeyValue(target, 'zweb/contracts/address/'+contractName, address);
        await this.ctx.web3bridge.putKeyValue(target, 'zweb/contracts/abi/'+contractName, artifacts_storage_id);

        this.ctx.client.deployerProgress.update(fileName, 100, `uploaded::${artifacts_storage_id}`);

        console.log(`Contract ${contractName} with Artifacts Storage ID ${artifacts_storage_id} is deployed to ${address}`);
    }

    async updateZDNS(host, id) {
        let target = host.replace('.z', '');
        console.log('Updating ZDNS', {target, id});
        await this.ctx.web3bridge.putZRecord(target, '0x'+id);
    }

    async storagePutUtf8String(content) {
        const cache_dir = path.join(this.ctx.datadir, this.config.cache_path);
        utils.makeSurePathExists(cache_dir);
        const tmpPostDataFilePath = path.join(cache_dir, utils.hashFnUtf8Hex(content));
        fs.writeFileSync(tmpPostDataFilePath, content);
        let uploaded = await this.ctx.client.storage.putFile(tmpPostDataFilePath);
        return uploaded.id;
    }

    async updateKeyValue (target, values, deployPath, deployContracts = false) {
        const replaceContentsWithCids = async obj => {

            const result = {};

            for (let [key, value] of Object.entries (obj)) {

                if (/^storage\[[^\]]+\]$/.test (key)) {

                    key = key.replace (/.*storage\[([^\]]+)\].*/, '$1');

                    if ('blob' in value) {

                        const tmpFilePath = path.join (
                            this.getCacheDir (),
                            utils.hashFnUtf8Hex (value.blob)
                        );

                        fs.writeFileSync (tmpFilePath, String (value.blob));
                        const uploaded = await this.ctx.client.storage.putFile (tmpFilePath);

                        value = uploaded.id;

                    } else if ('file' in value) {

                        const file = path.join (deployPath, 'public', value.file);

                        if (!fs.existsSync (file)) {
                            throw new Error ('File not found: ' + file);
                        }

                        const ext = value.file.replace (/.*\.([a-zA-Z0-9]+)$/, '$1');
                        const cid = (await this.ctx.client.storage.putFile (file)).id;

                        value = '/_storage/' + cid + '.' + ext;

                    } else {

                        throw new Error ('Storage resource not specified: ' + JSON.stringify (value));
                    }

                } else if (typeof value === 'object') {

                    value = await replaceContentsWithCids (value);

                } else if (Array.isArray (value)) {

                    for (let i in value) {

                        if (typeof value[i] === 'object') {

                            value[i] = await replaceContentsWithCids (value[i]);
                        }
                    }
                }

                result[key] = value;
            }

            return result;
        };

        values = await replaceContentsWithCids(values);

        for (let [key, value] of Object.entries(values)) {
            if (value && (Array.isArray(value) || typeof value === 'object')) {
                // if there is a contract_send in the value then send data to the specified contract
                if('contract_send' in value && deployContracts) {
                    let [contractName, methodNameAndParams] = value.contract_send.split('.');
                    let [methodName, paramsTogether] = methodNameAndParams.split('(');
                    paramsTogether = paramsTogether.replace(')', '');
                    let paramNames = paramsTogether.split(',');
                    let params = [];
                    if (value.metadata){
                        const metadataHash = await this.storagePutUtf8String(JSON.stringify(value.metadata));
                        value.metadata['metadataHash'] = metadataHash;
                        for(let paramName of paramNames) {
                            params.push(value.metadata[paramName]);
                        }
                    } else {
                        for(let paramName of paramNames) {
                            params.push(value[paramName]);
                        }
                    }
                    await this.ctx.web3bridge.sendToContract(target, contractName, methodName, params );
                }
                value = JSON.stringify(value);
            }
            await this.ctx.web3bridge.putKeyValue(target, key, String(value));
        }
    }
}

module.exports = Deployer;
