const path = require('path');
const fs = require('fs');
const logger = require('../../../core/log');
const log = logger.child({module: 'Deployer'});
const {compileContract, getImportsFactory, encodeCookieString, merge} = require('../../../util');
const {getNetworkPublicKey} = require('../../../wallet/keystore');
const blockchain = require('../../../network/providers/ethereum');
const solana = require('../../../network/providers/solana');
const hre = require('hardhat');
const BN = require('bn.js');
const {execSync} = require('child_process');

// TODO: direct import cause fails in some docker scripts
let storage;
const PROXY_METADATA_KEY = 'zweb/contracts/proxy/metadata';
const COMMIT_SHA_KEY = 'zweb/git/commit/sha';
const POINT_SDK_VERSION = 'zweb/point/sdk/version';
const POINT_NODE_VERSION = 'zweb/point/node/version';

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

    getBaseVersion(version) {
        let baseVersion;
        if (typeof version === 'number' && version.toString().indexOf('.') === -1) {
            baseVersion = version.toString() + '.0';
        } else {
            baseVersion = version.toString();
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

        return baseVersion;
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

    async getVersion(cfgVersion, identity, isPointTarget, isAlias) {
        if (!isPointTarget && !isAlias) return null;

        const baseVersion = this.getBaseVersion(cfgVersion);
        const lastVersion = await blockchain.getKeyLastVersion(identity, '::rootDir');

        if (this.isNewBaseVersionValid(lastVersion, baseVersion)) {
            return this.getNewPatchedVersion(lastVersion, baseVersion);
        } else {
            log.error(
                {baseVersion, lastVersion},
                'Base version should be greater or equal to MAJOR.MINOR of lastVersion.'
            );
            throw new Error(
                `'Base version ${baseVersion} should be greater or equal to MAJOR.MINOR of lastVersion ${lastVersion}.'`
            );
        }
    }

    getNameService(domain) {
        return domain.endsWith('.sol') ? 'SNS' : 'ENS';
    }

    getTargetAndIdentity(config, contracts, dev) {
        let identity;
        let target;
        let isPointTarget;
        let isAlias;

        // Handle the case when the target is not a .point domain (ie: .sol or .eth).
        if (config.target.endsWith('.sol') || config.target.endsWith('.eth')) {
            // For now, we don't support SNS nor ENS in devnets.
            if (dev) {
                const errMsg = `"dev" deployments are only supported for .point domains at the moment (trying to deploy ${config.target})`;
                log.error({target: config.target, dev}, errMsg);
                throw new Error(errMsg);
            }

            // Deployment of sites with contracts is only supported for .point domains as we need to store
            // several things in the Identity contract.
            // If the target is not .point and it includes contracts, it has to be an alias to a .point domain.
            if (!config.alias && contracts) {
                const errMsg = `Contracts is an advanced Point functionality only supported by .point domains at the moment. You need to specify a Point identity in the "alias" key in your deployment config`;
                log.error({target: config.target, alias: config.alias, contracts}, errMsg);
                throw new Error(errMsg);
            }

            // If the config does not include an `alias`, then it must include an `identity` key
            // with the Point identity.
            if (!config.alias && !config.identity) {
                const errMsg = `Must include a Point identity in deployment config (in the "identity" key) for target other than .point (trying to deploy ${config.target}).`;
                log.error({target: config.target}, errMsg);
                throw new Error(errMsg);
            }

            target = config.target;
            isPointTarget = false;
            isAlias = Boolean(config.alias);
            identity = isAlias
                ? config.alias.replace(/\.point$/, '')
                : config.identity.replace(/\.point$/, '');
        } else {
            // target is a .point domain
            target = dev ? `${config.target.replace('.point', 'dev')}.point` : config.target;
            isPointTarget = true;
            isAlias = false;
            identity = target.replace(/\.point$/, '');
        }

        return {target, isPointTarget, identity, isAlias};
    }

    async ensureIsDeployer(identity, owner) {
        const isDeployer = await blockchain.isIdentityDeployer(identity, owner);
        if (!isDeployer) {
            log.error({identity, owner}, 'The address is not allowed to deploy this identity');
            throw new Error(
                `The address ${owner} is not allowed to deploy on ${identity} identity`
            );
        }
    }

    async registerNewIdentity(identity, owner) {
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

        await blockchain.registerIdentity(identity, owner, Buffer.from(publicKey, 'hex'));
        log.sendMetric({identity, owner, publicKey: publicKey.toString('hex')});
        log.info(
            {identity, owner, publicKey: publicKey.toString('hex')},
            'Successfully registered new identity'
        );
    }

    async deployContracts(config, deployPath, version, target, force_deploy_proxy) {
        let proxyMetadataFilePath = '';
        let contractNames = config.contracts;
        if (!contractNames) contractNames = [];
        const identity = target.replace('.point', '');

        if (config.hasOwnProperty('upgradable') && config.upgradable) {
            proxyMetadataFilePath = await this.getProxyMetadataFilePath();
            for (const contractName of contractNames) {
                const fileName = path.join(deployPath, 'contracts', contractName + '.sol');
                fs.copyFileSync(
                    fileName,
                    path.resolve(
                        __dirname,
                        '..',
                        '..',
                        '..',
                        '..',
                        'hardhat',
                        'contracts',
                        contractName + '.sol'
                    )
                );
            }
            await hre.run('compile');
            for (const contractName of contractNames) {
                fs.unlinkSync(
                    path.resolve(
                        __dirname,
                        '..',
                        '..',
                        '..',
                        '..',
                        'hardhat',
                        'contracts',
                        contractName + '.sol'
                    )
                );
            }
        }
        for (const contractName of contractNames) {
            const fileName = path.join(deployPath, 'contracts', contractName + '.sol');

            try {
                let address;
                let artifactsDeployed;
                if (config.hasOwnProperty('useIDE')) {
                    let abiPath = '';
                    if (config.useIDE.name === 'truffle') {
                        abiPath = path.join(
                            deployPath,
                            config.useIDE.projectDir,
                            'build',
                            'contracts',
                            contractName + '.json'
                        );
                    } else if (config.useIDE.name === 'hardhat') {
                        abiPath = path.join(
                            deployPath,
                            config.useIDE.projectDir,
                            'build',
                            'contracts',
                            contractName + '.sol',
                            contractName + '.json'
                        );
                    }

                    if (abiPath !== '' && fs.existsSync(abiPath)) {
                        const abiFile = fs.readFileSync(abiPath, 'utf-8');
                        artifactsDeployed = JSON.parse(abiFile);
                    }

                    address = config.useIDE.addresses[contractName];
                } else {
                    if (config.hasOwnProperty('upgradable') && config.upgradable === true) {
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
                        if (
                            proxyAddress == null ||
                            proxyDescriptionFileId == null ||
                            force_deploy_proxy
                        ) {
                            log.debug('deployProxy call');
                            const cfg = {kind: 'uups'};
                            const idContract = await blockchain.loadIdentityContract();
                            log.debug({address: idContract.options.address}, 'Identity contract address');
                            try {
                                
                                log.debug({IdContractAddress: idContract.options.address, identity}, 'deploying proxy binded with identity contract and identity');
                                proxy = await hre.upgrades.deployProxy(contractF, [idContract.options.address, identity], cfg);
                            } catch (e){
                                log.warn('Deploying proxy binded with id contract and identity failed.');
                                log.debug({IdContractAddress: idContract.options.address, identity}, 'deployProxy call without parameters. Only the owner will be able to upgrade the proxy.');
                                proxy = await hre.upgrades.deployProxy(contractF, [], cfg);
                            }
                        } else {
                            log.debug('upgradeProxy call');
                            //restore from blockchain upgradable contracts and proxy metadata if does not exist.
                            if (!fs.existsSync('./.openzeppelin')) {
                                fs.mkdirSync('./.openzeppelin');
                            }
                            fs.writeFileSync(
                                proxyMetadataFilePath,
                                await storage.getFile(proxyDescriptionFileId)
                            );
                            
                            try {
                                proxy = await hre.upgrades.upgradeProxy(proxyAddress, contractF);    
                            } catch (e){
                                log.debug('upgradeProxy call failed');
                                log.debug('deleting proxy metadata file');
                                fs.unlinkSync(proxyMetadataFilePath);
                                log.debug('calling forceImport');
                                await hre.upgrades.forceImport(proxyAddress, contractF, {kind: 'uups'});
                                log.debug({proxyAddress}, 'upgradeProxy call after forceImport');
                                proxy = await hre.upgrades.upgradeProxy(proxyAddress, contractF);
                            }
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

        if (config.hasOwnProperty('upgradable') && config.upgradable === true) {
            try {
                // Upload proxy metadata

                const proxyMetadataFile = fs.readFileSync(proxyMetadataFilePath, 'utf-8');
                const proxyMetadata = JSON.parse(proxyMetadataFile);

                log.debug({proxyMetadata}, 'Uploading proxy metadata file...');
                this.ctx.client.deployerProgress.update(proxyMetadataFilePath, 0, 'uploading');
                const proxyMetadataFileUploadedId = await storage.uploadFile(
                    JSON.stringify(proxyMetadata)
                );
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

    async uploadRootDir(deployPath, rootDir = 'public') {
        log.debug('Uploading root directory...');
        const publicDirId = await storage.uploadDir(path.join(deployPath, rootDir));
        return publicDirId;
    }

    async uploadRoutes(deployPath) {
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

        return routeFileUploadedId;
    }

    async getChainId() {
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

    execCommand(command) {
        try {
            return execSync(command).toString();
        } catch (e) {
            return false;
        }
    }

    async ensureIsDomainOwner(target) {
        const service = this.getNameService(target);

        if (service === 'SNS') {
            const network = 'solana';
            const id = Date.now();
            const {result} = await solana.requestAccount(id, network);
            const solanaAddress = result.publicKey;
            const {owner: domainOwner, content} = await solana.resolveDomain(target, network);

            if (solanaAddress !== domainOwner) {
                const errMsg = `"${target}" is owned by ${domainOwner}, you need to transfer it to your Point Wallet (${solanaAddress}). Also, please make sure you have some SOL in your Point Wallet to cover transaction fees.`;
                log.error({solanaAddress, target, domainOwner}, errMsg);
                throw new Error(errMsg);
            }

            return {domainOwner, content};
        }

        if (service === 'ENS') {
            const network = 'rinkeby';
            const id = Date.now();
            const {result} = await blockchain.send({
                method: 'eth_accounts',
                params: [],
                id,
                network
            });

            const ethereumAddress = Array.isArray(result) && result.length > 0 && result[0];
            if (!ethereumAddress) {
                throw new Error('Could not find any ethereum addresses.');
            }

            const {owner, content} = await blockchain.resolveDomain(target, network);
            const domainOwner = typeof owner === 'string' && owner.toLowerCase();

            if (ethereumAddress !== domainOwner) {
                const errMsg = `"${target}" is owned by ${domainOwner}, you need to transfer it to your Point Wallet (${ethereumAddress}). Also, please make sure you have some ETH in your Point Wallet to cover transaction fees.`;
                log.error({ethereumAddress, target, domainOwner}, errMsg);
                throw new Error(errMsg);
            }

            return {domainOwner, content};
        }
    }

    async editDomainRegistry(domain, data, preExistingData) {
        const service = this.getNameService(domain);
        log.info({domain, data, service}, 'Saving data to domain registry.');

        if (service === 'SNS') {
            const dataStr = encodeCookieString(merge(preExistingData, data));
            await solana.setDomainContent(domain, dataStr);
        } else if (service === 'ENS') {
            // we don't have to care about preExistingData in ENS as we save the data
            // to a custom "text record", it's safe to overwrite it.
            const dataStr = encodeCookieString(data);
            await blockchain.setDomainContent(domain, dataStr);
        } else {
            throw new Error(`Unsupported Name Service ${service}`);
        }

        log.info({domain, data, service}, 'Successfully updated domain registry.');
    }

    async deploy(deployPath, deployContracts = false, dev = false, force_deploy_proxy = false) {
        // todo: error handling, as usual
        const deployConfigFilePath = path.join(deployPath, 'point.deploy.json');
        const deployConfigFile = fs.readFileSync(deployConfigFilePath, 'utf-8');
        const deployConfig = JSON.parse(deployConfigFile);

        if (!deployConfig.hasOwnProperty('version') ||
           !deployConfig.hasOwnProperty('target') ||
           !deployConfig.hasOwnProperty('keyvalue') ||
           !deployConfig.hasOwnProperty('contracts')
        ) {
            const errMsg = 'Missing entry in point.deploy.json file. The following properties must be present in the file: version, target, keyvalue and contracts. Fill them with empty values if needed.';
            log.error({deployConfigFilePath: deployConfigFilePath}, errMsg);
            throw new Error(errMsg);
        }

        const {target, isPointTarget, identity, isAlias} = this.getTargetAndIdentity(
            deployConfig,
            deployContracts,
            dev
        );

        const version = await this.getVersion(
            deployConfig.version,
            identity,
            isPointTarget,
            isAlias
        );

        const owner = blockchain.getOwner();
        
        const sigAddr = (await hre.ethers.getSigner()).address;
        if (owner !== sigAddr){
            throw new Error(
                `Invalid config, aborting. The wallet address ${owner} is different than ethers default signer ${sigAddr}.`
            );
        }

        const registeredOwner = await blockchain.ownerByIdentity(identity);
        const identityIsRegistered =
            registeredOwner && registeredOwner !== '0x0000000000000000000000000000000000000000';
        log.info({target, identity, owner, registeredOwner}, 'Owner information');

        // We will preserve any pre-existing content that may exist in the domain registry.
        let preExistingDomainContent;

        if (identityIsRegistered) {
            await this.ensureIsDeployer(identity, owner);
            if (!isPointTarget) {
                // If the target domain is not owned by the Point address of the user, we can't
                // move forward as we need to make transactions to store some data
                // in the domain registry (write to Solana or Ethereum blockchain).
                const {content} = await this.ensureIsDomainOwner(target);
                if (content && typeof content === 'string' && content.trim()) {
                    preExistingDomainContent = content;
                }
            }
        } else {
            this.registerNewIdentity(identity, owner);
            if (!isPointTarget) {
                // This means we will need to write some data to a domain registry,
                // which implies writing to the blockchain, hence, transaction fees.
                // To be able to make such transaction on behalf of the user, their
                // Point Wallet needs to own the domain, and it needs to have some
                // SOL or ETH (depending on the domain service) to cover the fees.
                // We've just created this account, so we know it doesn't have any funds
                // and it doesn't own the domain.
                log.error(
                    {target, identity, isAlias},
                    `Tried to deploy "${target}" with a Point identity we just created (doesn't own the domain, doesn't have funds)`
                );
                throw new Error(
                    `We have created your Point identity: "${identity}". Please transfer your domain "${target}" to your Point identity (go to https://point/wallet to find your blockchain addresses) and make sure you have enough funds to cover the transaction fee.`
                );
            }
        }

        const pointIdentity = isAlias ? identity : target;
        if (deployContracts) {
            await this.deployContracts(
                deployConfig,
                deployPath,
                version,
                pointIdentity,
                force_deploy_proxy
            );
        }

        const [publicDirId, routeFileUploadedId] = await Promise.all([
            this.uploadRootDir(deployPath, deployConfig.rootDir),
            this.uploadRoutes(deployPath)
        ]);

        // Check if we need to store the routes and root dir IDs in Point's Identity contract
        // or if they are going to be stored in the domain registry (Solana or Ethereum).
        if (isPointTarget || isAlias) {
            log.info(
                {publicDirId, routeFileUploadedId, target, identity},
                'Saving routes and root dir IDs to Point Identity contract...'
            );

            await this.updateKeyValue(
                pointIdentity,
                {'::rootDir': publicDirId},
                deployPath,
                deployContracts,
                version
            );

            await this.updateZDNS(pointIdentity, routeFileUploadedId, version);

            await this.updateKeyValue(
                pointIdentity,
                deployConfig.keyvalue,
                deployPath,
                deployContracts,
                version
            );

            await this.updateCommitSha(pointIdentity, deployPath, version);

            if (deployConfig.hasOwnProperty('pointSDKVersion')){
                await this.updatePointVersionTag(
                    pointIdentity, POINT_SDK_VERSION, deployConfig.pointSDKVersion, version
                );
            }

            if (deployConfig.hasOwnProperty('pointNodeVersion')){
                await this.updatePointVersionTag(
                    pointIdentity, POINT_NODE_VERSION, deployConfig.pointNodeVersion, version
                );
            }
        }

        if (!isPointTarget) {
            // Write Point data to domain registry.
            const domainRegistryData = isAlias ? {pn_alias: identity} : {
                pn_id: identity,
                pn_routes: routeFileUploadedId,
                pn_root: publicDirId
            };

            await this.editDomainRegistry(target, domainRegistryData, preExistingDomainContent);
            log.info({target, ...domainRegistryData}, 'Wrote Point data to domain registry');
        }

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

    async updateCommitSha(host, deployPath, version) {
        const target = host.replace('.point', '');

        const uncommittedChanges = this.execCommand(`cd ${deployPath} && git status --porcelain`);
        if (uncommittedChanges){
            log.warn({target, uncommittedChanges}, 'Uncommitted changes detected, the commit SHA could not correspond the version of DApp deployed');
        }

        const lastCommitSha = this.execCommand(`cd ${deployPath} && git rev-parse HEAD`);
        if (lastCommitSha){
            log.info({target, lastCommitSha}, 'Updating Commit SHA');
            await blockchain.putKeyValue(target, COMMIT_SHA_KEY, lastCommitSha, version);
        } else {
            log.info({target}, 'Commit SHA not found');
        }
    }

    async updatePointVersionTag(host, key, value, version) {
        const target = host.replace('.point', '');
        log.info({target, key}, 'Updating Point Version Tag');
        await blockchain.putKeyValue(target, key, value, version);
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
                    await blockchain.sendToContract(target, contractName, methodName, params);
                }
                value = JSON.stringify(value);
            }
            await blockchain.putKeyValue(target, key, String(value), version);
        }
    }
}

module.exports = Deployer;
