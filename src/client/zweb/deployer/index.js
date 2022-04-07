const path = require('path');
const fs = require('fs');
const logger = require('../../../core/log');
const log = logger.child({module: 'Deployer'});
const {compileContract, getImportsFactory} = require('../../../util/contract');
const {getNetworkPublicKey} = require('../../../wallet/keystore');
const blockchain = require('../../../network/blockchain');
const hre = require('hardhat');
const BN = require('bn.js');

// TODO: direct import cause fails in some docker scripts
let storage;
const PROXY_METADATA_KEY = 'zweb/contracts/proxy/metadata';

class Deployer {
    constructor(ctx) {
        this.ctx = ctx;
        this.cache_uploaded = {}; // todo: unused? either remove or use
        storage = require('../../storage/index.js');
    }

    async start() {
        // todo
    }

    getCacheDir() {
        const cache_dir = path.join(config.get('datadir'), config.get('deployer.cache_path'));
        return cache_dir;
    }

    isVersionFormated(baseVersion) {
        return /^\d+\.\d+$/.test(String(baseVersion));
    }

    getVersionParts(version) {
        const regex = /(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)/;
        const found = version.match(regex);
        if (found) {
            return {
                major: found.groups.major,
                minor: found.groups.minor,
                patch: found.groups.patch
            };
        } else {
            throw new Error('Version in wrong format ');
        }
    }

    isNewBaseVersionValid(oldVersion, newBaseVersion) {
        if (oldVersion === null || oldVersion === undefined || oldVersion === '') {
            return true;
        }

        const oldP = this.getVersionParts(oldVersion);
        const oldBaseVersion = new Number(oldP.major + '.' + oldP.minor);
        if (oldBaseVersion <= new Number(newBaseVersion)) {
            return true;
        } else {
            return false;
        }
    }

    getNewPatchedVersion(oldVersion, newBaseVersion) {
        if (oldVersion === null || oldVersion === undefined || oldVersion === '') {
            return newBaseVersion + '.0';
        }

        const oldP = this.getVersionParts(oldVersion);
        const oldBaseVersion = oldP.major + '.' + oldP.minor;
        if (oldBaseVersion === newBaseVersion) {
            return oldBaseVersion + '.' + (new Number(oldP.patch) + 1);
        } else {
            return newBaseVersion + '.0';
        }
    }

    async getChainId(){
        const id = await hre.ethers.provider.send('eth_chainId', []);
        return new BN(id.replace(/^0x/, ''), 'hex').toNumber();
    }

    //code to return exact the same file path of openzeppelin upgradable plugin
    async getProxyMetadataFilePath() {
        const networkNames = {
            1: 'mainnet',
            2: 'morden',
            3: 'ropsten',
            4: 'rinkeby',
            5: 'goerli',
            42: 'kovan'
        };
        const manifestDir = '.openzeppelin';

        const chainId = await this.getChainId();
        const name = networkNames[chainId] ?? `unknown-${chainId}`;
        return path.join('.', manifestDir, `${name}.json`);
    }

    async deploy(deployPath, deployContracts = false, dev = false) {
        // todo: error handling, as usual
        const deployConfigFilePath = path.join(deployPath, 'point.deploy.json');
        const deployConfigFile = fs.readFileSync(deployConfigFilePath, 'utf-8');
        const deployConfig = JSON.parse(deployConfigFile);
        let baseVersion;
        if (
            typeof deployConfig.version === 'number' &&
            deployConfig.version.toString().indexOf('.') === -1
        ) {
            baseVersion = deployConfig.version.toString() + '.0';
        } else {
            baseVersion = deployConfig.version.toString();
        }

        if (!this.isVersionFormated(baseVersion)) {
            log.error(
                {
                    deployConfigFilePath: deployConfigFilePath,
                    version: baseVersion
                },
                'Incorrect format of Version number. Should be MAJOR.MINOR.'
            );
            throw new Error(
                `Incorrect format of Version number ${baseVersion}. Should be MAJOR.MINOR.`
            );
        }

        const target = dev ? `${deployConfig.target.replace('.point', 'dev')}.point` : deployConfig.target;
        const identity = target.replace(/\.point$/, '');

        //get the last version.
        const lastVersion = await blockchain.getKeyLastVersion(identity, '::rootDir');

        //get the new version with patch.
        let version;
        if (this.isNewBaseVersionValid(lastVersion, baseVersion)) {
            version = this.getNewPatchedVersion(lastVersion, baseVersion);
        } else {
            log.error(
                {
                    deployConfigFilePath: deployConfigFilePath,
                    baseVersion: baseVersion,
                    lastVersion: lastVersion
                },
                'Base version should be greater or equal to MAJOR.MINOR of lastVersion.'
            );
            throw new Error(
                `'Base version ${baseVersion} should be greater or equal to MAJOR.MINOR of lastVersion ${lastVersion}.'`
            );
        }

        const owner = blockchain.getOwner();

        const registeredOwner = await blockchain.ownerByIdentity(identity);
        const identityIsRegistered =
            registeredOwner && registeredOwner !== '0x0000000000000000000000000000000000000000';

        if (identityIsRegistered && registeredOwner !== owner) {
            log.error({identity, registeredOwner, owner}, 'Identity is already registered');
            throw new Error(
                `Identity ${identity} is already registered, please choose a new one and try again`
            );
        }

        if (!identityIsRegistered) {
            const publicKey = getNetworkPublicKey();

            log.info(
                {
                    identity,
                    owner,
                    publicKey,
                    len: Buffer.byteLength(publicKey, 'utf-8'),
                    parts: [`0x${publicKey.slice(0, 32)}`, `0x${publicKey.slice(32)}`]
                },
                'Registering new identity'
            );

            await blockchain.registerIdentity(
                identity,
                owner,
                Buffer.from(publicKey, 'hex')
            );
            log.sendMetric({identity, owner, publicKey: publicKey.toString('hex')});
            log.info(
                {identity, owner, publicKey: publicKey.toString('hex')},
                'Successfully registered new identity'
            );
        }

        // Deploy contracts
        if (deployContracts) {
            let proxyMetadataFilePath = '';
            let contractNames = deployConfig.contracts;
            if (!contractNames) contractNames = [];

            if (deployConfig.hasOwnProperty('upgradable') && deployConfig.upgradable === true){
                proxyMetadataFilePath = await this.getProxyMetadataFilePath();
                for (const contractName of contractNames) {
                    const fileName = path.join(deployPath, 'contracts', contractName + '.sol');
                    fs.copyFileSync(fileName, path.resolve(__dirname, '..', '..', '..', '..', 'hardhat', 'contracts', contractName + '.sol'));
                }
                await hre.run('compile');
                for (const contractName of contractNames) {
                    fs.unlinkSync(path.resolve(__dirname, '..', '..', '..', '..', 'hardhat', 'contracts', contractName + '.sol'));
                }
            }
            for (const contractName of contractNames) {
                const fileName = path.join(deployPath, 'contracts', contractName + '.sol');
                
                try {
                    let address;
                    let artifactsDeployed;
                    if (deployConfig.hasOwnProperty('upgradable') && deployConfig.upgradable === true){

                        const proxyAddress = await blockchain.getKeyValue(
                            target,
                            'zweb/contracts/address/' + contractName,
                            version,
                            'equalOrBefore'
                        );

                        const proxyDescriptionFileId = await blockchain.getKeyValue(
                            target,
                            PROXY_METADATA_KEY,
                            version,
                            'equalOrBefore'
                        );
                        
                        let proxy;
                        const contractF = await hre.ethers.getContractFactory(contractName);
                        if (proxyAddress == null || proxyDescriptionFileId == null){
                            log.debug('deployProxy call');
                            proxy = await hre.upgrades.deployProxy(contractF, [], {kind: 'uups'});
                        } else {
                            log.debug('upgradeProxy call');
                            //restore from blockchain upgradable contracts and proxy metadata if does not exist. 
                            if (!fs.existsSync(proxyMetadataFilePath)){
                                if (!fs.existsSync('./.openzeppelin')){
                                    fs.mkdirSync('./.openzeppelin');    
                                }
                                fs.writeFileSync(proxyMetadataFilePath, 
                                    await storage.getFile(proxyDescriptionFileId));
                            }
                            
                            proxy = await hre.upgrades.upgradeProxy(proxyAddress, contractF);
                        }
                        await proxy.deployed();                            
                        address = proxy.address;
                        
                        artifactsDeployed = await hre.artifacts.readArtifact(contractName);
                    } else {
                        const {contract, artifacts} = await this.compileContract(
                            contractName,
                            fileName,
                            deployPath
                        );

                        artifactsDeployed = artifacts;

                        address = await blockchain.deployContract(
                            contract,
                            artifacts,
                            contractName
                        );
                    }
                    this.ctx.client.deployerProgress.update(fileName, 40, 'deployed');

                    const artifactsStorageId = await this.storeContractArtifacts(
                        artifactsDeployed,
                        fileName,
                        contractName,
                        version,
                        address,
                        target
                    );

                    log.debug(
                        `Contract ${contractName} with Artifacts Storage ID ${artifactsStorageId} is deployed to ${address}`
                    );
                } catch (e) {
                    log.error(e, 'Zapp contract deployment error');
                    throw e;
                }
            }

            if (deployConfig.hasOwnProperty('upgradable') && deployConfig.upgradable === true){
                try {
                    // Upload proxy metadata
                    
                    const proxyMetadataFile = fs.readFileSync(proxyMetadataFilePath, 'utf-8');
                    const proxyMetadata = JSON.parse(proxyMetadataFile);

                    log.debug({proxyMetadata}, 'Uploading proxy metadata file...');
                    this.ctx.client.deployerProgress.update(proxyMetadataFilePath, 0, 'uploading');
                    const proxyMetadataFileUploadedId = 
                        await storage.uploadFile(JSON.stringify(proxyMetadata));
                    this.ctx.client.deployerProgress.update(
                        proxyMetadataFilePath,
                        100,
                        `uploaded::${proxyMetadataFileUploadedId}`
                    );
                    await this.updateProxyMetadata(target, proxyMetadataFileUploadedId, version);
                    log.debug('Proxy metadata updated');
                } catch (e) {
                    log.error(e, 'Zapp contract deployment error');
                    throw e;
                }
            }
        }

        // Upload public - root dir
        log.debug('Uploading root directory...');
        let rootDirFolder = 'public'
        if (deployConfig.hasOwnProperty('rootDir') && deployConfig.rootDir !== ''){
            rootDirFolder = deployConfig.rootDir;
        }

        const publicDirId = await storage.uploadDir(path.join(deployPath, rootDirFolder));
        await this.updateKeyValue(
            target,
            {'::rootDir': publicDirId},
            deployPath,
            deployContracts,
            version
        );

        // Upload routes
        const routesFilePath = path.join(deployPath, 'routes.json');
        const routesFile = fs.readFileSync(routesFilePath, 'utf-8');
        const routes = JSON.parse(routesFile);

        log.debug({routes}, 'Uploading route file...');
        this.ctx.client.deployerProgress.update(routesFilePath, 0, 'uploading');
        const routeFileUploadedId = await storage.uploadFile(JSON.stringify(routes));
        this.ctx.client.deployerProgress.update(
            routesFilePath,
            100,
            `uploaded::${routeFileUploadedId}`
        );
        await this.updateZDNS(target, routeFileUploadedId, version);
        await this.updateKeyValue(
            target,
            deployConfig.keyvalue,
            deployPath,
            deployContracts,
            version
        );

        log.info('Deploy finished');
    }

    async compileContract(contractName, fileName, deployPath) {
        this.ctx.client.deployerProgress.update(fileName, 0, 'compiling');
        const contractPath = path.join(deployPath, 'contracts');
        const nodeModulesPath = path.join(deployPath, 'node_modules');
        const originalPath = path.join(deployPath, 'contracts');
        const getImports = getImportsFactory(nodeModulesPath, originalPath);
        const compiledSources = JSON.parse(
            compileContract({name: contractName, contractPath, getImports})
        );

        if (!compiledSources) {
            throw new Error(
                '>>>>>>>>>>>>>>>>>>>>>>>> SOLIDITY COMPILATION ERRORS <<<<<<<<<<<<<<<<<<<<<<<<\nNO OUTPUT'
            );
        } else if (compiledSources.errors) {
            let found = false;
            let msg = '';
            for (const e of compiledSources.errors) {
                if (e.severity === 'warning') {
                    log.warn(e, 'Contract compilation warning');
                    continue;
                }
                found = true;
                msg += e.formattedMessage + '\n';
            }
            msg =
                '>>>>>>>>>>>>>>>>>>>>>>>> SOLIDITY COMPILATION ERRORS <<<<<<<<<<<<<<<<<<<<<<<<\n' +
                msg;
            if (found) throw new Error(msg);
        }

        this.ctx.client.deployerProgress.update(fileName, 20, 'compiled');

        let artifacts;
        for (const contractFileName in compiledSources.contracts) {
            const fileName = contractFileName
                .split('\\')
                .pop()
                .split('/')
                .pop();
            const _contractName = fileName.replace('.sol', '');
            if (contractName === _contractName) {
                artifacts = compiledSources.contracts[contractFileName][_contractName];
            }
        }

        const contract = blockchain.getContractFromAbi(artifacts.abi);
        return {contract, artifacts};
    }

    async storeContractArtifacts(artifacts, fileName, contractName, version, address, target) {
        const artifactsJSON = JSON.stringify(artifacts);

        this.ctx.client.deployerProgress.update(fileName, 60, 'saving_artifacts');
        const artifactsStorageId = await storage.uploadFile(artifactsJSON);

        this.ctx.client.deployerProgress.update(fileName, 80, `updating_zweb_contracts`);
        await blockchain.putKeyValue(
            target,
            'zweb/contracts/address/' + contractName,
            address,
            version
        );
        await blockchain.putKeyValue(
            target,
            'zweb/contracts/abi/' + contractName,
            artifactsStorageId,
            version
        );

        this.ctx.client.deployerProgress.update(fileName, 100, `uploaded::${artifactsStorageId}`);
        return artifactsStorageId;
    }

    async updateZDNS(host, id, version) {
        const target = host.replace('.point', '');
        log.info({target, id}, 'Updating ZDNS');
        await blockchain.putZRecord(target, '0x' + id, version);
    }

    async updateProxyMetadata(host, id, version) {
        const target = host.replace('.point', '');
        log.info({target, id}, 'Updating Proxy Metatada');
        await blockchain.putKeyValue(target, PROXY_METADATA_KEY, id, version);
    }

    async updateKeyValue(target, values = {}, deployPath, deployContracts = false, version) {
        const replaceContentsWithCids = async obj => {
            const result = {};

            for (let [key, value] of Object.entries(obj)) {
                if (/^storage\[[^\]]+\]$/.test(key)) {
                    key = key.replace(/.*storage\[([^\]]+)\].*/, '$1');

                    if ('blob' in value) {
                        const uploaded = await storage.uploadFile(String(value.blob));

                        value = uploaded;
                    } else if ('file' in value) {
                        const filePath = path.join(deployPath, 'public', value.file);

                        if (!fs.existsSync(filePath)) {
                            throw new Error('File not found: ' + filePath);
                        }

                        const ext = value.file.replace(/.*\.([a-zA-Z0-9]+)$/, '$1');
                        const file = await fs.promises.readFile(filePath);
                        const cid = await storage.uploadFile(file);

                        value = '/_storage/' + cid + '.' + ext;
                    } else {
                        throw new Error('Storage resource not specified: ' + JSON.stringify(value));
                    }
                } else if (value && typeof value === 'object') {
                    value = await replaceContentsWithCids(value);
                } else if (Array.isArray(value)) {
                    for (const i in value) {
                        if (value[i] && typeof value[i] === 'object') {
                            value[i] = await replaceContentsWithCids(value[i]);
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
                if ('contract_send' in value && deployContracts) {
                    const [contractName, methodNameAndParams] = value.contract_send.split('.');
                    let [methodName, paramsTogether] = methodNameAndParams.split('(');
                    paramsTogether = paramsTogether.replace(')', '');
                    const paramNames = paramsTogether.split(',');
                    const params = [];
                    if (value.metadata) {
                        const metadataHash = await storage.uploadFile(
                            JSON.stringify(value.metadata)
                        );
                        value.metadata['metadataHash'] = metadataHash;
                        for (const paramName of paramNames) {
                            params.push(value.metadata[paramName]);
                        }
                    } else {
                        for (const paramName of paramNames) {
                            params.push(value[paramName]);
                        }
                    }
                    await blockchain.sendToContract(
                        target,
                        contractName,
                        methodName,
                        params
                    );
                }
                value = JSON.stringify(value);
            }
            await blockchain.putKeyValue(target, key, String(value), version);
        }
    }
}

module.exports = Deployer;
