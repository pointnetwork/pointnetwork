const path = require('path');
const fs = require('fs');
const logger = require('../../../core/log');
const log = logger.child({module: 'Deployer'});
const {
    compileContract,
    getImportsFactory,
    encodeCookieString,
    mergeAndResolveConflicts
} = require('../../../util');
const {getNetworkPublicKey} = require('../../../wallet/keystore');
const blockchain = require('../../../network/providers/ethereum');
const solana = require('../../../network/providers/solana');
const hre = require('hardhat');
const BN = require('bn.js');
const {execSync} = require('child_process');
const {getFile, uploadDir, uploadFile} = require('../../storage');

const PROXY_METADATA_KEY = 'zweb/contracts/proxy/metadata';
const COMMIT_SHA_KEY = 'zweb/git/commit/sha';
const POINT_SDK_VERSION = 'zweb/point/sdk/version';
const POINT_NODE_VERSION = 'zweb/point/node/version';

/**
 * Class responsible to deploy DApps in Point Network.
 */
class Deployer {
    /**
     * Constructor for the class
     */
    constructor() {
        this.cache_uploaded = {}; // todo: unused? either remove or use
    }

    /**
     * Initialization method
     */
    async start() {
        // todo
    }

    /**
     * Gets the cache dir from the config
     * 
     * @returns cache dir
     */
    getCacheDir() {
        const cache_dir = path.join(config.get('datadir'), config.get('deployer.cache_path'));
        return cache_dir;
    }

    /**
     * Get the version number and format it as Major.Minor.
     * 
     * @param {string|number} version - Version as stated in point.deploy.json
     * @returns {string} - Base version formated as Major.Minor
     */
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

    /**
     * Checks if the version passed is in the format Major.Minor
     * 
     * @param {string} baseVersion - Version string
     * @returns {boolean} if the version is in the format Major.Minor
     */
    isVersionFormated(baseVersion) {
        return /^\d+\.\d+$/.test(String(baseVersion));
    }

    /**
     * Split the version string in Major.Minor.Path
     * 
     * @param {string} version - Version string  
     * @returns {object} - Version splited on a object with the properties major, minor and path.
     */
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

    /**
     * Checks if the new base version (Major.minor) is higher that the old one.
     * 
     * @param {string} oldVersion - old base version.
     * @param {string} newBaseVersion - new base version.
     * @returns {boolean} - If the new base versio is higher than the old one.
     */
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

    /**
     * Get a new base patched version incremented by one (format Major.minor.patch)
     * if the base version is not changed from old one, or with .0 
     * if the base version is different from the previous one.
     * 
     * @param {string} oldVersion - Old base version string 
     * @param {string} newBaseVersion - New base version string
     * @returns {string} - new patched version
     */
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

    /**
     * Get the version which the DApp will be deployed considering the version
     * stated in the point.deploy.json and the latest version of the DApp deployed in the blockchain.
     * 
     * @param {string} cfgVersion - Version stated in the point.deploy.json.
     * @param {string} identity - Identity to search the latest version deployed in the blockchain.
     * @param {boolean} isPointTarget - If the target is a .point domain.
     * @param {boolean} isAlias - If the target is an alias.
     * @returns {string} - New valid version to deploy the DApp.
     * 
     * @throws - Error if the version passed in the cfgVersion parameter is invalid for the identity.
     */
    async getVersion(cfgVersion, identity, isPointTarget, isAlias) {
        if (!isPointTarget && !isAlias) return null;

        const baseVersion = this.getBaseVersion(cfgVersion);
        const lastVersion = await blockchain.getikVersion(identity, '::rootDir');

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

    /**
     * Get domain name service used in a domain.
     * 
     * @param {string} domain - The fill name of the domain 
     * @returns SNS or ENS dependind of the domain name passed.
     */
    getNameService(domain) {
        return domain.endsWith('.sol') ? 'SNS' : 'ENS';
    }

    /**
     * Get the target and identity to deploy the DApp
     * 
     * @param {object} config - The configuration object of the deploy 
     * @param {boolean} contracts - If the contracts flag is set 
     * @param {boolean} dev - If the dev flag is set
     * @returns {object} - {target - string target to deploy, isPointTarget - boolean - if is .point domain, identity - string, isAlias - if it is an alias}
     */
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

            target = config.target;
            isPointTarget = false;
            isAlias = Boolean(config.alias);
            // If the config does not include an alias, the `.sol|.eth` domain will be used as identity.
            identity = isAlias ? config.alias.replace(/\.point$/, '') : config.target;
        } else {
            // target is a .point domain
            target = dev ? `${config.target.replace('.point', 'dev')}.point` : config.target;
            isPointTarget = true;
            isAlias = false;
            identity = target.replace(/\.point$/, '');
        }

        return {target: target.toLowerCase(), isPointTarget, identity, isAlias};
    }

    /**
     * Verify if the owner address parameter is authorized as deployer for this identity
     * 
     * @param {string} identity - identity
     * @param {address} owner - address which wants to deploy for this identity
     * 
     * @throws Error if the address is not authorized as a deployer of the identity
     */
    async ensureIsDeployer(identity, owner) {
        const isDeployer = await blockchain.isIdentityDeployer(identity, owner);
        if (!isDeployer) {
            log.error({identity, owner}, 'The address is not allowed to deploy this identity');
            throw new Error(
                `The address ${owner} is not allowed to deploy on ${identity} identity`
            );
        }
    }

    /**
     * Register a new identity for the specified owner
     * 
     * @param {string} identity - identity name
     * @param {address} owner - address of the owner
     */
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

    /**
     * Deply a set of contracts specified in point.deploy.json of the DApp.
     * 
     * @param {object} config - point.deploy config object.
     * @param {string} deployPath - Path to the DApp.
     * @param {string} version - Version specified to deploy. 
     * @param {string} target - the target name which will the contracts be deployed
     * @param {boolean} force_deploy_proxy - flag to force deploy a new proxy for upgradable contracts
     */
    async deployContracts(config, deployPath, version, target, force_deploy_proxy) {
        let proxyMetadataFilePath = '';
        let contractNames = config.contracts;
        if (!contractNames) contractNames = [];
        const identity = target.replace('.point', '');

        //checks if the contracts of the dapp are upgradable and compile upgradable contracts
        //this step is necessary to hardhat upgradable plugin to work.
        if (config.hasOwnProperty('upgradable') && config.upgradable) {
            //retrieve the metadata file path which should match with openzeppelin plugin one to work
            proxyMetadataFilePath = await this.getProxyMetadataFilePath();

            //for each contract declared in point.deploy.json
            for (const contractName of contractNames) {
                //resolve the path to the contract
                const fileName = path.join(deployPath, 'contracts', contractName + '.sol');
                //copy it to hardhat folder for compiling it
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
            //compile all contracts with hardhat command.
            await hre.run('compile');
            //delete the sources for cleaning any cache for next compilations.
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

        //for each contract
        for (const contractName of contractNames) {
            
            //resolve the file name
            const fileName = path.join(deployPath, 'contracts', contractName + '.sol');

            try {
                let address;
                let artifactsDeployed;
                //if useIDE flag is set, will use specific paths and abis from the
                //specified IDE to write arctifacts and addresses to IKV registry.
                if (config.hasOwnProperty('useIDE')) {
                    let abiPath = '';
                    //get abiPath from truffle
                    if (config.useIDE.name === 'truffle') {
                        abiPath = path.join(
                            deployPath,
                            config.useIDE.projectDir,
                            'build',
                            'contracts',
                            contractName + '.json'
                        );
                    } else if (config.useIDE.name === 'hardhat') {
                        //get abi path from hardhat
                        abiPath = path.join(
                            deployPath,
                            config.useIDE.projectDir,
                            'build',
                            'contracts',
                            contractName + '.sol',
                            contractName + '.json'
                        );
                    }

                    //reads and load the abi from the file.
                    if (abiPath !== '' && fs.existsSync(abiPath)) {
                        const abiFile = fs.readFileSync(abiPath, 'utf-8');
                        artifactsDeployed = JSON.parse(abiFile);
                    }
                    //get the contract address from the point.deploy.json
                    address = config.useIDE.addresses[contractName];
                } else {
                    // will not use an IDE for deployment, so is the default deployment
                    // for point.

                    if (config.hasOwnProperty('upgradable') && config.upgradable === true) {
                        //if the contracts are upgradable 

                        //get the address of the proxy
                        const proxyAddress = await blockchain.getKeyValue(
                            target,
                            'zweb/contracts/address/' + contractName,
                            version,
                            'equalOrBefore'
                        );
                        
                        //get proxy metadata file from the IKV registry
                        const proxyDescriptionFileId = await blockchain.getKeyValue(
                            target,
                            PROXY_METADATA_KEY,
                            version,
                            'equalOrBefore'
                        );
                        
                        //using openzeppelin upgradable hardhat plugin:
                        let proxy;
                        //loads the contract factory
                        const contractF = await hre.ethers.getContractFactory(contractName);
                        //if there is no previous deployment or
                        // do not found metadata file or
                        // forcing the deployment of a new proxy
                        if (
                            proxyAddress == null || 
                            proxyDescriptionFileId == null || 
                            force_deploy_proxy 
                        ) {
                            //deploy a new proxy
                            log.debug('deployProxy call');
                            const cfg = {kind: 'uups'};
                            //loads the identity contract
                            const idContract = await blockchain.loadIdentityContract();
                            try {
                                log.debug(
                                    {IdContractAddress: idContract.options.address, identity},
                                    'deploying proxy binded with identity contract and identity'
                                );
                                // Uses the address of identity contract and identity name as
                                // parameters for deploying a new proxy using openzeppelin 
                                // hardhat upgradable plugin. Those parameters should be declared
                                // in the initializer of the upgradable contract.
                                proxy = await hre.upgrades.deployProxy(
                                    contractF,
                                    [idContract.options.address, identity],
                                    cfg
                                );
                            } catch (e) {
                                // Fallback in case of fail the deployment of the proxy.
                                // Some cases the upgradable contrac may not have parameters in the initializers of 
                                // the upgradable contract. In this case, the deployment is performed
                                // without parameters. In this way, the deployers feature
                                // will not work and only the owner of the proxy will be able
                                // to upgrade the proxy.
                                log.warn(
                                    'Deploying proxy binded with id contract and identity failed.'
                                );
                                log.debug(
                                    {IdContractAddress: idContract.options.address, identity},
                                    'deployProxy call without parameters. Only the owner will be able to upgrade the proxy.'
                                );
                                proxy = await hre.upgrades.deployProxy(contractF, [], cfg);
                            }
                        } else {
                            //will upgrade the proxy
                            log.debug('upgradeProxy call');

                            //restore from blockchain upgradable contracts and proxy metadata if does not exist.
                            if (!fs.existsSync('./.openzeppelin')) {
                                fs.mkdirSync('./.openzeppelin');
                            }
                            //write the file for the path that the plugin needs to validate the
                            //upgradable contract.
                            fs.writeFileSync(
                                proxyMetadataFilePath,
                                await getFile(proxyDescriptionFileId)
                            );

                            try {
                                //try to upgrade the proxy
                                //in this step the contract is validated and if any problem
                                //is found the plugin raises an erro.
                                proxy = await hre.upgrades.upgradeProxy(proxyAddress, contractF);
                            } catch (e) {
                                //fallback for solve a common problem for upgrade the proxy
                                log.debug('upgradeProxy call failed');

                                //Proxy metadata file can be corrupted or not updated. Then:
                                //Delete the metadata file.
                                log.debug('deleting proxy metadata file');
                                fs.unlinkSync(proxyMetadataFilePath);
                                //Restore the file from the blockchain.
                                log.debug('calling forceImport');
                                const kind = 'uups';
                                await hre.upgrades.forceImport(proxyAddress, contractF, {kind});
                                //try to deploy again with the new metadata file.
                                log.debug({proxyAddress}, 'upgradeProxy call after forceImport');
                                proxy = await hre.upgrades.upgradeProxy(proxyAddress, contractF);
                            }
                        }
                        //wait until the proxy is effectivelly deployed.
                        await proxy.deployed();
                        //get the address of the proxy
                        address = proxy.address;
                        //reads the atifacts using hardhat.
                        artifactsDeployed = await hre.artifacts.readArtifact(contractName);
                    } else {
                        //the contracts are not upgradable, so normal deployment

                        //complie using solc
                        const {contract, artifacts} = await this.compileContract(
                            contractName,
                            fileName,
                            deployPath
                        );

                        //get the artifacts
                        artifactsDeployed = artifacts;

                        //send the transaction of deployment to the blockchain
                        address = await blockchain.deployContract(
                            contract,
                            artifacts,
                            contractName
                        );
                    }
                }

                //upload files to arweave and store IKV values for the deployment
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

        //if the contracts are upgradable, metadata file will be uploaded and IKV from it stored.
        if (config.hasOwnProperty('upgradable') && config.upgradable === true) {
            try {
                // Upload proxy metadata
                const proxyMetadataFile = fs.readFileSync(proxyMetadataFilePath, 'utf-8');
                const proxyMetadata = JSON.parse(proxyMetadataFile);

                log.debug({proxyMetadata}, 'Uploading proxy metadata file...');
                //upload the file
                const proxyMetadataFileUploadedId = await uploadFile(JSON.stringify(proxyMetadata));
                //update the IKV from metadata file
                await this.updateProxyMetadata(target, proxyMetadataFileUploadedId, version);
                log.debug('Proxy metadata updated');
            } catch (e) {
                log.error(e, 'Zapp contract deployment error');
                throw e;
            }
        }
    }

    /**
     * Upload the static compiled Js files to arweave.
     * 
     * @param {string} deployPath - The path to the DApp.
     * @param {string} rootDir - The name of the folder of the DApp which contain js compiled static files.
     * @returns {string} the id of the directory tht was uploaded. 
     */
    async uploadRootDir(deployPath, rootDir = 'public') {
        log.debug('Uploading root directory...');
        const publicDirId = await uploadDir(path.join(deployPath, rootDir));
        return publicDirId;
    }

    /**
     * Upload the routes.json file to arweave
     * 
     * @param {string} deployPath - Path to the DApp root folder which must contain routes.json.
     * @returns {string} id of the file uploaded 
     */
    async uploadRoutes(deployPath) {
        const routesFilePath = path.join(deployPath, 'routes.json');
        const routesFile = fs.readFileSync(routesFilePath, 'utf-8');
        const routes = JSON.parse(routesFile);

        log.debug({routes}, 'Uploading route file...');
        return uploadFile(JSON.stringify(routes));
    }

    /**
     * Get the chain id from the connected blochain using hardhat and ethers default provider.
     * 
     * @returns {number} chain id.
     */
    async getChainId() {
        const id = await hre.ethers.provider.send('eth_chainId', []);
        return new BN(id.replace(/^0x/, ''), 'hex').toNumber();
    }

    /**
     * Get the exact the same file path of openzeppelin upgradable plugin
     * for using with upgradable plugin deployment.
     * 
     * @returns the full path, including the name, for the metadata file.
     */
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

    /**
     * Executes a command in the shell.
     * Used to run git commands during the deployment. 
     * 
     * @param {string} command - command string
     * @returns {string} the result of the command
     */
    execCommand(command) {
        try {
            return execSync(command).toString();
        } catch (e) {
            return false;
        }
    }

    /**
     * Verify if the domain name is owned by the connected account.
     * 
     * @param {string} target - the target domain (SNS or ENS)
     * @returns {object} - {domainOwner - address of the owner, content - from the name record}
     */
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

    /**
     * Edits the domain registry of a domain (ENS or SNS).
     * 
     * @param {string} domain - Name of the domain (ENS or SNS)
     * @param {string} data - The data to be registered 
     * @param {string} preExistingData - Previous data to be merged with the new one.
     */
    async editDomainRegistry(domain, data, preExistingData) {
        const service = this.getNameService(domain);
        log.info({domain, data, service}, 'Saving data to domain registry.');

        if (service === 'SNS') {
            const dataStr = encodeCookieString(mergeAndResolveConflicts(preExistingData, data));
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

    /**
     * Deploy a DApp to Point Network
     * 
     * @param {string} deployPath - Path to the dapp folder which will be deployed
     * @param {boolean} deployContracts - Flag that indicate if will deploy contracts or not.
     * @param {boolean} dev - Flag that indicate if it is in dev mode or not
     * @param {boolean} forceDeployProxy - Flag that indicate if will force to deploy a new proxy or not (only for upgradable contracts)
     * @param {object} config - Configuration object loaded from deployment description of the Dapp (point.deploy.json)
     */
    async deploy({
        deployPath,
        deployContracts = false,
        dev = false,
        forceDeployProxy = false,
        config
    }) {
        //loads the config file
        let deployConfig = config;
        if (!deployConfig) {
            // todo: error handling, as usual
            const deployConfigFilePath = path.join(deployPath, 'point.deploy.json');
            const deployConfigFile = await fs.promises.readFile(deployConfigFilePath, 'utf-8');
            deployConfig = JSON.parse(deployConfigFile);
        }

        //check if all entries needed in point.deploy.json are present in the parameter
        if (
            !deployConfig.hasOwnProperty('version') ||
            !deployConfig.hasOwnProperty('target') ||
            !deployConfig.hasOwnProperty('keyvalue') ||
            !deployConfig.hasOwnProperty('contracts')
        ) {
            const errMsg =
                'Missing entry in point.deploy.json file. The following properties must be present in the file: version, target, keyvalue and contracts. Fill them with empty values if needed.';
            log.error({deployConfigFilePath: deployConfigFilePath}, errMsg);
            throw new Error(errMsg);
        }

        //load targed and identity data
        const {target, isPointTarget, identity, isAlias} = this.getTargetAndIdentity(
            deployConfig,
            deployContracts,
            dev
        );
        
        //get the version for the deploy
        const version = await this.getVersion(
            deployConfig.version,
            identity,
            isPointTarget,
            isAlias
        );

        // Will be used to store any pre-existing content in .sol or .eth domain registry.
        let preExistingDomainContent = '';

        if (isPointTarget) {
            //if is a .point domain
            
            //get the default address connected
            const owner = blockchain.getOwner();

            //get the default signer for ethers
            const sigAddr = (await hre.ethers.getSigner()).address;

            //if they are not the same throw an error.
            if (owner !== sigAddr) {
                throw new Error(
                    `Invalid config, aborting. The wallet address ${owner} is different than ethers default signer ${sigAddr}.`
                );
            }

            //get the owner address for the target identity
            const registeredOwner = await blockchain.ownerByIdentity(identity);
            log.info({target, identity, owner, registeredOwner}, 'Owner information');

            //checks if the identity is already registered
            const identityIsRegistered =
                registeredOwner && registeredOwner !== '0x0000000000000000000000000000000000000000';

            //if is registered checks if the owner has access to deploy to this identity
            if (identityIsRegistered) {
                await this.ensureIsDeployer(identity, owner);
            } else {
                //In zappdev env is possible to deploy to a not registered yet identity.
                //This makes easy the development because you just deploy the DApp
                //and the identity is created and registered on the fly. 
                if (process.env.MODE === 'zappdev') {
                    await this.registerNewIdentity(identity, owner);
                } else {
                    throw new Error(
                        `You must register ${identity} before you can make a deployment. Start Point, head over to https://point in Point Browser, register ${identity} and then retry the deploy command.`
                    );
                }
            }
        } else {
            // If the target domain is not owned by the Point Wallet of the user, we can't
            // move forward as we need to make transactions to store some data
            // in the domain registry (write to Solana or Ethereum blockchain).
            const {content} = await this.ensureIsDomainOwner(target);

            // We will preserve any pre-existing content that may exist in the domain registry.
            if (content && typeof content === 'string' && content.trim()) {
                preExistingDomainContent = content;
            }
        }

        //upload static files and routes.json
        const [publicDirId, routeFileUploadedId] = await Promise.all([
            this.uploadRootDir(deployPath, deployConfig.rootDir),
            this.uploadRoutes(deployPath)
        ]);

        //if is a .point domain or alias
        if (isPointTarget || isAlias) {

            // Deploy contracts (if required) and store routes and root dir IDs in Point Identity contract.
            const pointIdentity = isAlias ? identity : target;
            if (deployContracts) {
                //deploy contracts if needed.  
                await this.deployContracts(
                    deployConfig,
                    deployPath,
                    version,
                    pointIdentity,
                    forceDeployProxy
                );
            }

            log.info(
                {publicDirId, routeFileUploadedId, target, identity},
                'Saving routes and root dir IDs to Point Identity contract...'
            );
            
            //update rootDir entry in IKV system
            await this.updateKeyValue(
                pointIdentity,
                {'::rootDir': publicDirId},
                deployPath,
                deployContracts,
                version
            );

            //update zdns entry in IKV system
            await this.updateZDNS(pointIdentity, routeFileUploadedId, version);

            //update the key values entries from point.deploy.json
            await this.updateKeyValue(
                pointIdentity,
                deployConfig.keyvalue,
                deployPath,
                deployContracts,
                version
            );
            
            //store the commit sha from root directory of the DApp in the IKV system
            //for version control of the code deployed.
            await this.updateCommitSha(pointIdentity, deployPath, version);
            
            //store the point sdk version needed to run this dapp if is set in point.deploy.json
            if (deployConfig.hasOwnProperty('pointSDKVersion')) {
                await this.updatePointVersionTag(
                    pointIdentity,
                    POINT_SDK_VERSION,
                    deployConfig.pointSDKVersion,
                    version
                );
            }

            //store the point node version needed to run this dapp if is set in point.deploy.json
            if (deployConfig.hasOwnProperty('pointNodeVersion')) {
                await this.updatePointVersionTag(
                    pointIdentity,
                    POINT_NODE_VERSION,
                    deployConfig.pointNodeVersion,
                    version
                );
            }
        }

        //if is ENS or SNS domain (not .point)
        if (!isPointTarget) {
            // Write Point data to domain registry.
            const domainRegistryData = isAlias
                ? {pn_alias: identity}
                : {pn_routes: routeFileUploadedId, pn_root: publicDirId};

            await this.editDomainRegistry(target, domainRegistryData, preExistingDomainContent);
            log.info({target, ...domainRegistryData}, 'Wrote Point data to domain registry');
        }

        log.info('Deploy finished');
    }

    /**
     * Compiles a contract using SOLC and Web3.js.
     * 
     * @param {string} contractName - The name of the contrac
     * @param {string} deployPath - The pathe from where the contract is placed (dapp folder).
     * @returns {object} - {contract - Web3.js instance of the contract, artifacts - the artifacts from the contracts inside the file complied}
     */
    async compileContract(contractName, fileName, deployPath) {
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

    /**
     * Store the contract and artifacts in arweave and IKV system.
     * 
     * @param {object} artifacts - the artifacts of the contract (abi)
     * @param {string} contractName - the name of the contract
     * @param {string} version - the version of the contract
     * @param {address} address - the address from where the contract was deployed
     * @param {string} target - the target domain 
     * 
     * @returns the id of the file from artifacts stored
     */
    async storeContractArtifacts(artifacts, fileName, contractName, version, address, target) {
        //convert the abi to string.
        const artifactsJSON = JSON.stringify(artifacts);

        //upload the abi string.
        const artifactsStorageId = await uploadFile(artifactsJSON);

        //register the contract address in the IKV system
        await blockchain.putKeyValue(
            target,
            'zweb/contracts/address/' + contractName,
            address,
            version
        );
        
        //register the abi in the IKV system
        await blockchain.putKeyValue(
            target,
            'zweb/contracts/abi/' + contractName,
            artifactsStorageId,
            version
        );

        return artifactsStorageId;
    }

    /**
     * Update the ZDNS entry in IKV system
     * 
     * @param {string} host - the host/domain to update the record.
     * @param {string} id - the id of the file uploaded to arweave
     * @param {string} version - the version of the entry 
     */
    async updateZDNS(host, id, version) {
        const target = host.replace('.point', '');
        log.info({target, id}, 'Updating ZDNS');
        await blockchain.putZRecord(target, '0x' + id, version);
    }

    /**
     * Update the metadata record in IKV system
     * 
     * @param {*} host - the host/target to update
     * @param {*} id - the id of the file uploaded to arweave 
     * @param {*} version - the version of the entry
     */
    async updateProxyMetadata(host, id, version) {
        const target = host.replace('.point', '');
        log.info({target, id}, 'Updating Proxy Metatada');
        await blockchain.putKeyValue(target, PROXY_METADATA_KEY, id, version);
    }

    /**
     * Get the last commit sha from the root directory of the DApp and update the
     * IKV system with it for source code version control.
     * 
     * @param {string} host - the host/target involved 
     * @param {string} deployPath - the path to the DApp 
     * @param {string} version - the version of the entry
     */
    async updateCommitSha(host, deployPath, version) {
        const target = host.replace('.point', '');

        const uncommittedChanges = this.execCommand(`cd ${deployPath} && git status --porcelain`);
        if (uncommittedChanges) {
            log.warn(
                {target, uncommittedChanges},
                'Uncommitted changes detected, the commit SHA could not correspond the version of DApp deployed'
            );
        }

        const lastCommitSha = this.execCommand(`cd ${deployPath} && git rev-parse HEAD`);
        if (lastCommitSha) {
            log.info({target, lastCommitSha}, 'Updating Commit SHA');
            await blockchain.putKeyValue(target, COMMIT_SHA_KEY, lastCommitSha, version);
        } else {
            log.info({target}, 'Commit SHA not found');
        }
    }

    /**
     * Updates a entry for point engine version or point SDK required for running a DApp.
     * 
     * @param {string} host - the host/target involved
     * @param {string} key - key for the update POINT_SDK_VERSION or POINT_NODE_VERSION
     * @param {string} value - the value for storing
     * @param {string} version - the version of the dapp
     */
    async updatePointVersionTag(host, key, value, version) {
        const target = host.replace('.point', '');
        log.info({target, key}, 'Updating Point Version Tag');
        await blockchain.putKeyValue(target, key, value, version);
    }


    /**
     * Update the IKV system inserting the values passed and calling contract methods passed as values.
     * This method also upload files to arweave if they are passed in the keyvalue entry.
     * 
     * To better understand this method please see keyvalue entry in this file: https://github.com/pointnetwork/template.point/blob/main/point.deploy.json.
     * 
     * @param {string} target - the host involved
     * @param {object} values - values to be stored in the IKV system. Can include contract_send and storage[content] also. 
     * @param {string} deployPath - the path to the DApp 
     * @param {boolean} deployContracts - flag which indicate if contract_send methods will be called.
     * @param {string} version - the version of the DApp.
     */
    async updateKeyValue(target, values = {}, deployPath, deployContracts = false, version) {
        const replaceContentsWithCids = async obj => {
            const result = {};

            for (let [key, value] of Object.entries(obj)) {
                if (/^storage\[[^\]]+\]$/.test(key)) {
                    key = key.replace(/.*storage\[([^\]]+)\].*/, '$1');

                    if ('blob' in value) {
                        const uploaded = await uploadFile(String(value.blob));

                        value = uploaded;
                    } else if ('file' in value) {
                        const filePath = path.join(deployPath, 'public', value.file);

                        if (!fs.existsSync(filePath)) {
                            throw new Error('File not found: ' + filePath);
                        }

                        const ext = value.file.replace(/.*\.([a-zA-Z0-9]+)$/, '$1');
                        const file = await fs.promises.readFile(filePath);
                        const cid = await uploadFile(file);

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
                        const metadataHash = await uploadFile(JSON.stringify(value.metadata));
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
