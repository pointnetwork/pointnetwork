const path = require('path');
const Web3 = require('web3');
const fs = require('fs');
const _ = require('lodash');
const HDWalletProvider = require('@truffle/hdwallet-provider');
const NonceTrackerSubprovider = require('web3-provider-engine/subproviders/nonce-tracker');
const {getJSON} = require('../client/storage');
const ZDNS_ROUTES_KEY = 'zdns/routes';
const retryableErrors = {ESOCKETTIMEDOUT: 1};
const config = require('config');
const logger = require('../core/log');
const {compileContract, getContractAddress} = require('../util/contract');
const log = logger.child({module: 'Web3Bridge'});
const {getNetworkPrivateKey, getNetworkAddress} = require('../wallet/keystore');
const {utils, resolveHome} = require('../core/utils');

function isRetryableError({message}) {
    for (const code in retryableErrors) {
        if (RegExp(code).test(message)) {
            return true;
        }
    }
    return false;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function createWeb3Instance({blockchainUrl, privateKey}) {
    const hdWalletProvider = new HDWalletProvider(privateKey, blockchainUrl);
    const nonceTracker = new NonceTrackerSubprovider();

    hdWalletProvider.engine._providers.unshift(nonceTracker);
    nonceTracker.setEngine(hdWalletProvider.engine);

    const web3 = new Web3(hdWalletProvider);
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);

    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    return web3;
}

const abisByContractName = {};
class Web3Bridge {
    constructor(ctx) {
        this.ctx = ctx;
        this.connectionString = config.get('network.web3');
        this.address = getNetworkAddress();
        this.web3_call_retry_limit = config.get('network.web3_call_retry_limit');
        this.web3 = this.ctx.web3 = this.ctx.network.web3 = this.createWeb3Instance(); // todo: maybe you should hide it behind this abstraction, no?
        log.debug('Successfully created a web3 instance');
        this.ctx.web3bridge = this;
        this.start();
    }

    createWeb3Instance() {
        return createWeb3Instance({
            blockchainUrl: config.get('network.web3'),
            privateKey: '0x' + getNetworkPrivateKey()
        });
    }

    async start() { }

    async loadPointContract(contractName, at) {

        if (!(contractName in abisByContractName)) {

            const buildDirPath = path.resolve(
                resolveHome(config.get('datadir')),
                'hardhat',
                'artifacts',
                'contracts'
            );
            
            const abiFileName = path.resolve(buildDirPath, contractName + '.sol/' + contractName + '.json');

            if (!fs.existsSync(abiFileName)) {
                if (!fs.existsSync(buildDirPath)) {
                    fs.mkdirSync(buildDirPath, {recursive: true});
                }
                const contractPath = path.resolve(
                    this.ctx.basepath,
                    '..',
                    'hardhat',
                    'contracts'
                );
                await compileContract({name: contractName, contractPath, buildDirPath});
            }

            const abiFile = JSON.parse(fs.readFileSync(abiFileName));

            abisByContractName[contractName] = abiFile.abi;
        }

        return new this.web3.eth.Contract(abisByContractName[contractName], at);
    }

    async loadIdentityContract() {
        const at = getContractAddress('Identity');
        return await this.loadPointContract('Identity', at);
    }

    async loadWebsiteContract(target, contractName, version = 'latest') {
        // todo: make it nicer, extend to all potential contracts, and add to docs
        // @ means internal contract for Point Network (truffle/contracts)
        if (target === '@' && contractName === 'Identity') {
            return this.loadIdentityContract();
        }

        const at = await this.ctx.web3bridge.getKeyValue(
            target,
            'zweb/contracts/address/' + contractName,
            version,
            'equalOrBefore'
        );
        const abi_storage_id = await this.ctx.web3bridge.getKeyValue(
            target,
            'zweb/contracts/abi/' + contractName,
            version,
            'equalOrBefore'
        );

        let abi;
        try {
            abi = await getJSON(abi_storage_id); // todo: verify result, security, what if fails
            // todo: cache the result, because contract's abi at this specific address won't change (i think? check.)

            return new this.web3.eth.Contract(abi.abi, at);
        } catch (e) {
            throw Error(
                'Could not read abi of the contract ' +
                utils.escape(contractName) +
                '. Reason: ' +
                e +
                '. If you are the website developer, are you sure you have specified in point.deploy.json config that you want this contract to be deployed?'
            );
        }
    }

    async web3send(method, optons = {}) {
        let account, gasPrice;
        let {gasLimit, amountInWei} = optons;
        let attempt = 0;
        let requestStart;

        while (true) {
            try {
                account = this.web3.eth.defaultAccount;
                gasPrice = await this.web3.eth.getGasPrice();
                log.debug(
                    {gasLimit, gasPrice, account},
                    'Prepared to send tx to contract method'
                );
                // if (!gasLimit) {
                gasLimit = await method.estimateGas({from: account, value: amountInWei});
                log.debug({gasLimit, gasPrice}, 'Web3 Send gas estimate');
                // }
                requestStart = Date.now();
                return await method.send({
                    from: account,
                    gasPrice,
                    gas: gasLimit,
                    value: amountInWei
                });
            } catch (error) {
                log.error(
                    {
                        method: method._method.name,
                        account,
                        gasPrice,
                        gasLimit,
                        optons,
                        error,
                        stack: error.stack,
                        timePassedSinceRequestStart: Date.now() - requestStart
                    },
                    'Web3 Contract Send error:'
                );
                if (isRetryableError(error) && this.web3_call_retry_limit - ++attempt > 0) {
                    log.debug({attempt}, 'Retrying Web3 Contract Send');
                    await sleep(attempt * 1000);
                    continue;
                }
                throw error;
            }
        }
        /*
        .on('transactionHash', function(hash){
            ...
        })
        .on('confirmation', function(confirmationNumber, receipt){
            ...
        })
        .on('receipt', function(receipt){
        https://web3js.readthedocs.io/en/v1.2.11/web3-eth-contract.html#id37
         */
    }

    async callContract(target, contractName, method, params, version = 'latest') {
        // todo: multiple arguments, but check existing usage // huh?
        let attempt = 0;
        log.debug({target, contractName, method, params}, 'Contract Call');
        while (true) {
            try {
                const contract = await this.loadWebsiteContract(target, contractName, version);
                if (!Array.isArray(params)) {
                    throw Error('Params sent to callContract is not an array');
                }

                if (!contract.methods[method]) {
                    throw Error('Method ' + method + ' does not exist on contract ' + contractName); // todo: sanitize
                }

                const result = await contract.methods[method](...params).call();

                return result;
            } catch (error) {
                log.error(
                    {
                        contractName,
                        method,
                        params,
                        target,
                        error,
                        stack: error.stack,
                        line: error.line
                    },
                    'Web3 Contract Call error:'
                );
                if (isRetryableError(error) && this.web3_call_retry_limit - ++attempt > 0) {
                    log.debug({attempt}, 'Retrying Web3 Contract Call');
                    await sleep(attempt * 1000);
                    continue;
                }
                throw error;
            }
        }
    }

    async getPastEvents(target, contractName, event, options = {fromBlock: 0, toBlock: 'latest'}) {
        const contract = await this.loadWebsiteContract(target, contractName);
        let events = await contract.getPastEvents(event, options);
        //filter non-indexed properties from return value for convenience
        if (options.hasOwnProperty('filter') && Object.keys(options.filter).length > 0) {
            for (const k in options.filter) {
                events = events.filter(e => e.returnValues[k] === options.filter[k]);
            }
        }
        return events;
    }

    async getBlockTimestamp(blockNumber) {
        return (await this.web3.eth.getBlock(blockNumber)).timestamp;
    }

    async subscribeContractEvent(target, contractName, event, onEvent, onStart, options = {}) {
        const contract = await this.loadWebsiteContract(target, contractName);

        let subscriptionId;
        return contract.events[event](options)
            .on('data', data => onEvent({subscriptionId, data}))
            .on('connected', id => onStart({
                subscriptionId: (subscriptionId = id),
                data: {message: `Subscribed to "${contractName}" contract "${event}" events with subscription id: ${id}`}
            }));
    }

    async removeSubscriptionById(subscriptionId, onRemove) {
        await this.web3.eth.removeSubscriptionById(subscriptionId);
        return onRemove({
            subscriptionId,
            data: {message: `Unsubscribed from subscription id: ${subscriptionId}`}
        });
    }

    async sendToContract(target, contractName, methodName, params, options = {}, version = 'latest') {
        //Block send call from versions that are not the latest one.
        if (version !== 'latest'){
            log.error({
                target,
                contractName,
                methodName,
                params,
                options,
                version
            }, 'Error: Contract send does not allowed for versions different than latest.');
            throw new Error(`Forbidden, contract send does not allowed for versions different than latest. Contract: ${contractName}, method: ${methodName}, version: ${version}`);
        }
        
        // todo: multiple arguments, but check existing usage // huh?
        const contract = await this.loadWebsiteContract(target, contractName);

        if (!Array.isArray(params)) throw Error('Params sent to callContract is not an array');

        // storage id: convert string -> bytes32
        for (const k in contract.methods) {
            if (k.split('(')[0] === methodName && k.includes('(')) {
                // example of k: send(address,bytes32,string)
                let paramIdx = 0;
                const kArgTypes = k.split('(')[1].replace(')', '').split(',');
                for (const kArgType of kArgTypes) {
                    if (kArgType === 'bytes32') {
                        // Potential candidate for conversion
                        const param_value = params[paramIdx];
                        if (
                            typeof param_value === 'string' &&
                            param_value.replace('0x', '').length === 32 * 2
                        ) {
                            // 256 bit
                            // Turns out, you only need to add 0x
                            if (!_.startsWith(param_value, '0x'))
                                params[paramIdx] = '0x' + param_value;
                        }
                    }
                    paramIdx++;
                }
            }
        }

        // Now call the method
        const method = contract.methods[methodName](...params);
        await this.web3send(method, options);
    }

    async identityByOwner(owner) {
        try {
            const identityContract = await this.loadIdentityContract();
            const method = identityContract.methods.getIdentityByOwner(owner);
            return await method.call();
        } catch (e) {
            log.error({owner}, 'Error: identityByOwner');
            throw e;
        }
    }

    async ownerByIdentity(identity) {
        try {
            const identityContract = await this.loadIdentityContract();
            const method = identityContract.methods.getOwnerByIdentity(identity);
            return await method.call();
        } catch (e) {
            log.error({identity}, 'Error: ownerByIdentity');
            throw e;
        }
    }

    async commPublicKeyByIdentity(identity) {
        try {
            const identityContract = await this.loadIdentityContract();
            const method = identityContract.methods.getCommPublicKeyByIdentity(identity);
            const parts = await method.call();
            return '0x' + parts.part1.replace('0x', '') + parts.part2.replace('0x', '');
            // todo: make damn sure it didn't return something silly like 0x0 or 0x by mistake
        } catch (e) {
            log.error('Error: commPublicKeyByIdentity', {identity});
        }
    }

    async getZRecord(domain, version = 'latest') {
        domain = domain.replace('.z', ''); // todo: rtrim instead
        let result = await this.getKeyValue(domain, ZDNS_ROUTES_KEY, version);
        if (result != null && result.substr(0, 2) === '0x') result = result.substr(2);
        return result;
    }

    async putZRecord(domain, routesFile, version) {
        domain = domain.replace('.z', ''); // todo: rtrim instead
        return await this.putKeyValue(domain, ZDNS_ROUTES_KEY, routesFile, version);
    }

    async getKeyLastVersion(identity, key){
        const filter = {identity: identity, key: key};
        const events = await this.getPastEvents('@', 'Identity', 'IKVSet', {filter, fromBlock: 0, toBlock: 'latest'});
        if (events.length > 0){
            const maxObj = events.reduce((prev, current) => 
                (prev.blockNumber > current.blockNumber) ? prev : current);
            return maxObj.returnValues.version;
        } else {
            return null; 
        }
    }

    compareVersions(v1, v2){
        const v1p = v1.split('.');
        const v2p = v2.split('.');
        for (const i in v1p){
            if (v1p[i] > v2p[i]){
                return 1;
            } else if (v1p[i] < v2p[i]) {
                return -1;
            }
        }
        return 0;
    }

    getLastVersionOrBefore(version, events){
        const filteredEvents = events.filter(e => 
            [-1, 0].includes(this.compareVersions(e.returnValues.version, version)));
        const maxObj = filteredEvents.reduce((prev, current) => 
            (this.compareVersions(prev.returnValues.version, current.returnValues.version) === 1) 
                ? prev : current);
        return maxObj.returnValues.value;
    }

    async getKeyValue(identity, key, version = 'latest', versionSearchStrategy = 'exact') {
        try {
            if (typeof identity !== 'string')
                throw Error('web3bridge.getKeyValue(): identity must be a string');
            if (typeof key !== 'string')
                throw Error('web3bridge.getKeyValue(): key must be a string');
            if (typeof version !== 'string')
                throw Error('web3bridge.getKeyValue(): version must be a string');
            
            identity = identity.replace('.z', ''); // todo: rtrim instead

            if (version === 'latest'){
                const contract = await this.loadIdentityContract();
                const result = await contract.methods.ikvGet(identity, key).call();
                return result;
            } else {
                if (versionSearchStrategy === 'exact'){
                    const filter = {identity: identity, key: key, version: version};
                    const events = await this.getPastEvents('@', 'Identity', 'IKVSet', {filter, fromBlock: 0, toBlock: 'latest'});
                    if (events.length > 0){
                        return events[0].returnValues.value;
                    } else {
                        return null;
                    }
                } else if (versionSearchStrategy === 'equalOrBefore'){
                    const filter = {identity: identity, key: key};
                    const events = await this.getPastEvents('@', 'Identity', 'IKVSet', {filter, fromBlock: 0, toBlock: 'latest'});
                    const value = this.getLastVersionOrBefore(version, events);
                    return value;
                } else {
                    return null;
                }
            }
        } catch (e) {
            log.error({error: e, stack: e.stack, identity, key, version}, 'getKeyValue error');
            throw e;
        }
    }
    async putKeyValue(identity, key, value, version) {
        try {
            // todo: only send transaction if it's different. if it's already the same value, no need
            identity = identity.replace('.z', ''); // todo: rtrim instead
            const contract = await this.loadIdentityContract();
            const method = contract.methods.ikvPut(identity, key, value, version);
            log.debug({identity, key, value, version}, 'Ready to put key value');
            await this.web3send(method);
        } catch (e) {
            log.error({error: e, stack: e.stack, identity, key, value, version}, 'putKeyValue error');
            throw e;
        }
    }

    async registerIdentity(identity, address, commPublicKey) {
        try {
            if (!Buffer.isBuffer(commPublicKey))
                throw Error('registerIdentity: commPublicKey must be a buffer');
            if (Buffer.byteLength(commPublicKey) !== 64)
                throw Error('registerIdentity: commPublicKey must be 64 bytes');
            // todo: validate identity and address

            identity = identity.replace('.z', ''); // todo: rtrim instead
            const contract = await this.loadIdentityContract();
            const method = contract.methods.register(
                identity,
                address,
                `0x${commPublicKey.slice(0, 32).toString('hex')}`,
                `0x${commPublicKey.slice(32).toString('hex')}`
            );

            const result = await this.web3send(method);
            log.info(result, 'Identity registration result');

            return result;
        } catch (e) {
            log.error(
                {error: e, stack: e.stack, identity, address, commPublicKey},
                'Identity registration error'
            );
            throw e;
        }
    }

    async isCurrentIdentityRegistered() {
        const address = getNetworkAddress();
        const identity = await this.identityByOwner(address);
        if (
            !identity ||
            identity.replace('0x', '').toLowerCase() === address.replace('0x', '').toLowerCase()
        )
            return false;
        return true;
    }

    async getCurrentIdentity() {
        const address = getNetworkAddress();
        return await this.identityByOwner(address);
    }

    async toChecksumAddress(address) {
        const checksumAddress = this.web3.utils.toChecksumAddress(address);
        return checksumAddress;
    }
}

module.exports = Web3Bridge;
