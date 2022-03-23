const path = require('path');
const Web3 = require('web3');
const ethereumjs = require('ethereumjs-util');
const {promises: fs} = require('fs');
const _ = require('lodash');
const HDWalletProvider = require('@truffle/hdwallet-provider');
const NonceTrackerSubprovider = require('web3-provider-engine/subproviders/nonce-tracker');
const {getFile, getJSON} = require('../client/storage');
const ZDNS_ROUTES_KEY = 'zdns/routes';
const retryableErrors = {ESOCKETTIMEDOUT: 1};
const config = require('config');
const logger = require('../core/log');
const {compileAndSaveContract} = require('../util/contract');
const log = logger.child({module: 'Blockchain'});
const {getNetworkPrivateKey, getNetworkAddress} = require('../wallet/keystore');
const utils = require('../core/utils');
const {statAsync} = require('../util');

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

    log.debug({blockchainUrl}, '@@@ Created web3 instance');
    return web3;
}

const abisByContractName = {};

const web3CallRetryLimit = config.get('network.web3_call_retry_limit');

const web3 = createWeb3Instance({
    blockchainUrl: config.get('network.web3'),
    privateKey: '0x' + getNetworkPrivateKey()
});

// Client that consolidates all blockchain-related functionality
const blockchain = {};

blockchain.loadPointContract = async (
    contractName,
    at,
    basepath = path.resolve(__dirname, '..')
) => {
    if (!(contractName in abisByContractName)) {
        const buildDirPath = path.resolve(
            utils.resolveHome(config.get('datadir')),
            config.get('network.contracts_path')
        );

        const abiFileName = path.resolve(buildDirPath, contractName + '.json');

        try {
            await statAsync(abiFileName);
        } catch (e) {
            log.debug(`${contractName} contract not found`);

            const mode = config.get('mode');
            if (contractName === 'Identity' && mode !== 'e2e' && mode !== 'zappdev') {
                try {
                    log.debug('Fetching Identity contract from storage');
                    const abiFile = await getFile(config.get('identity_contract_id'));
                    await fs.writeFile(abiFileName, abiFile);

                    log.debug('Successfully fetched identity contract from storage');

                    abisByContractName[contractName] = JSON.parse(abiFile).abi;
                    return new web3.eth.Contract(abisByContractName[contractName], at);
                } catch (e) {
                    log.error('Failed to fetch Identity contract from storage: ' + e.message);
                }
            }

            log.debug(`Compiling ${contractName} contract at ${at}`);
            const contractPath = path.resolve(basepath, '..', 'hardhat', 'contracts');
            await compileAndSaveContract({name: contractName, contractPath, buildDirPath});

            log.debug('Identity contract successfully compiled');
        }

        const abiFile = JSON.parse(await fs.readFile(abiFileName, 'utf8'));

        abisByContractName[contractName] = abiFile.abi;
    }

    return new web3.eth.Contract(abisByContractName[contractName], at);
};

blockchain.loadIdentityContract = async () => {
    const addressFromEnv = process.env.IDENTITY_CONTRACT_ADDRESS;
    const at = addressFromEnv || config.get('network.identity_contract_address');
    log.debug({address: at}, '@@@ Identity contract address');
    return await blockchain.loadPointContract('Identity', at);
};

blockchain.loadWebsiteContract = async (target, contractName, version = 'latest') => {
    // todo: make it nicer, extend to all potential contracts, and add to docs
    // @ means internal contract for Point Network (truffle/contracts)
    if (target === '@' && contractName === 'Identity') {
        return blockchain.loadIdentityContract();
    }

    const at = await blockchain.getKeyValue(
        target,
        'zweb/contracts/address/' + contractName,
        version,
        'equalOrBefore'
    );
    const abi_storage_id = await blockchain.getKeyValue(
        target,
        'zweb/contracts/abi/' + contractName,
        version,
        'equalOrBefore'
    );

    let abi;
    try {
        abi = await getJSON(abi_storage_id); // todo: verify result, security, what if fails
        // todo: cache the result, because contract's abi at this specific address won't change (i think? check.)

        return new web3.eth.Contract(abi.abi, at);
    } catch (e) {
        throw Error(
            'Could not read abi of the contract ' +
                utils.escape(contractName) +
                '. Reason: ' +
                e +
                '. If you are the website developer, are you sure you have specified in point.deploy.json config that you want this contract to be deployed?'
        );
    }
};

blockchain.web3send = async (method, optons = {}) => {
    let account, gasPrice;
    let {gasLimit, amountInWei} = optons;
    let attempt = 0;
    let requestStart;

    while (true) {
        try {
            account = web3.eth.defaultAccount;
            gasPrice = await web3.eth.getGasPrice();
            log.debug(
                {gasLimit, gasPrice, account, method: method._method.name},
                'Prepared to send tx to contract method'
            );
            // if (!gasLimit) {
            gasLimit = await method.estimateGas({from: account, value: amountInWei});
            log.debug({gasLimit, gasPrice}, 'Web3 Send gas estimate');
            // }
            requestStart = Date.now();
            return await method
                .send({
                    from: account,
                    gasPrice,
                    gas: gasLimit,
                    value: amountInWei
                })
                .on('confirmation', (confirmationNumber, receipt) => {
                    const {transactionHash, blockNumber, status} = receipt;
                    log.debug(
                        {confirmationNumber, transactionHash, blockNumber, status},
                        'registerIdentity: confirmation of blockchain tx'
                    );
                })
                .on('error', (error, receipt) => {
                    const {transactionHash, blockNumber, status} = receipt;
                    log.debug(
                        {error, transactionHash, blockNumber, status},
                        'registerIdentity: error sending tx'
                    );
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
            if (isRetryableError(error) && web3CallRetryLimit - ++attempt > 0) {
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
};

blockchain.callContract = async (target, contractName, method, params, version = 'latest') => {
    // todo: multiple arguments, but check existing usage // huh?
    let attempt = 0;
    log.debug({target, contractName, method, params}, 'Contract Call');
    while (true) {
        try {
            const contract = await blockchain.loadWebsiteContract(target, contractName, version);
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
            if (isRetryableError(error) && web3CallRetryLimit - ++attempt > 0) {
                log.debug({attempt}, 'Retrying Web3 Contract Call');
                await sleep(attempt * 1000);
                continue;
            }
            throw error;
        }
    }
};

blockchain.getPastEvents = async (
    target,
    contractName,
    event,
    options = {fromBlock: 0, toBlock: 'latest'}
) => {
    const contract = await blockchain.loadWebsiteContract(target, contractName);
    let events = await contract.getPastEvents(event, options);
    //filter non-indexed properties from return value for convenience
    if (options.hasOwnProperty('filter') && Object.keys(options.filter).length > 0) {
        for (const k in options.filter) {
            events = events.filter(e => e.returnValues[k] === options.filter[k]);
        }
    }
    return events;
};

blockchain.getBlockTimestamp = async blockNumber => {
    const block = await web3.eth.getBlock(blockNumber);
    return block.timestamp;
};

blockchain.subscribeContractEvent = async (
    target,
    contractName,
    event,
    onEvent,
    onStart,
    options = {}
) => {
    const contract = await blockchain.loadWebsiteContract(target, contractName);

    let subscriptionId;
    return contract.events[event](options)
        .on('data', data => onEvent({subscriptionId, data}))
        .on('connected', id => {
            const message = `Subscribed to "${contractName}" contract "${event}" events with subscription id: ${id}`;
            onStart({
                subscriptionId: (subscriptionId = id),
                data: {message}
            });
        });
};

blockchain.removeSubscriptionById = async (subscriptionId, onRemove) => {
    await web3.eth.removeSubscriptionById(subscriptionId);
    return onRemove({
        subscriptionId,
        data: {message: `Unsubscribed from subscription id: ${subscriptionId}`}
    });
};

blockchain.sendToContract = async (
    target,
    contractName,
    methodName,
    params,
    options = {},
    version = 'latest'
) => {
    //Block send call from versions that are not the latest one.
    if (version !== 'latest') {
        log.error(
            {
                target,
                contractName,
                methodName,
                params,
                options,
                version
            },
            'Error: Contract send does not allowed for versions different than latest.'
        );
        throw new Error(
            `Forbidden, contract send does not allowed for versions different than latest. Contract: ${contractName}, method: ${methodName}, version: ${version}`
        );
    }

    // todo: multiple arguments, but check existing usage // huh?
    const contract = await blockchain.loadWebsiteContract(target, contractName);

    if (!Array.isArray(params)) throw Error('Params sent to callContract is not an array');

    // storage id: convert string -> bytes32
    for (const k in contract.methods) {
        if (k.split('(')[0] === methodName && k.includes('(')) {
            // example of k: send(address,bytes32,string)
            let paramIdx = 0;
            const kArgTypes = k
                .split('(')[1]
                .replace(')', '')
                .split(',');
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
                        if (!_.startsWith(param_value, '0x')) params[paramIdx] = '0x' + param_value;
                    }
                }
                paramIdx++;
            }
        }
    }

    // Now call the method
    const method = contract.methods[methodName](...params);
    return blockchain.web3send(method, options);
};

blockchain.identityByOwner = async owner => {
    try {
        const identityContract = await blockchain.loadIdentityContract();
        const method = identityContract.methods.getIdentityByOwner(owner);
        return await method.call();
    } catch (e) {
        log.error({owner}, 'Error: identityByOwner');
        throw e;
    }
};

blockchain.ownerByIdentity = async identity => {
    try {
        const identityContract = await blockchain.loadIdentityContract();
        const method = identityContract.methods.getOwnerByIdentity(identity);
        return await method.call();
    } catch (e) {
        log.error({identity}, 'Error: ownerByIdentity');
        throw e;
    }
};

blockchain.commPublicKeyByIdentity = async identity => {
    try {
        const identityContract = await blockchain.loadIdentityContract();
        const method = identityContract.methods.getCommPublicKeyByIdentity(identity);
        const parts = await method.call();
        return '0x' + parts.part1.replace('0x', '') + parts.part2.replace('0x', '');
        // todo: make damn sure it didn't return something silly like 0x0 or 0x by mistake
    } catch (e) {
        log.error('Error: commPublicKeyByIdentity', {identity});
    }
};

blockchain.getZRecord = async (domain, version = 'latest') => {
    domain = domain.replace('.point', ''); // todo: rtrim instead
    let result = await blockchain.getKeyValue(domain, ZDNS_ROUTES_KEY, version);
    if (result != null && result.substr(0, 2) === '0x') result = result.substr(2);
    return result;
};

blockchain.putZRecord = async (domain, routesFile, version) => {
    domain = domain.replace('.point', ''); // todo: rtrim instead
    return await blockchain.putKeyValue(domain, ZDNS_ROUTES_KEY, routesFile, version);
};

blockchain.getKeyLastVersion = async (identity, key) => {
    const filter = {identity: identity, key: key};
    const events = await blockchain.getPastEvents('@', 'Identity', 'IKVSet', {
        filter,
        fromBlock: 0,
        toBlock: 'latest'
    });
    if (events.length > 0) {
        const maxObj = events.reduce((prev, current) =>
            prev.blockNumber > current.blockNumber ? prev : current
        );
        return maxObj.returnValues.version;
    } else {
        return null;
    }
};

blockchain.compareVersions = (v1, v2) => {
    const v1p = v1.split('.');
    const v2p = v2.split('.');
    for (const i in v1p) {
        if (v1p[i] > v2p[i]) {
            return 1;
        } else if (v1p[i] < v2p[i]) {
            return -1;
        }
    }
    return 0;
};

blockchain.getLastVersionOrBefore = (version, events) => {
    const filteredEvents = events.filter(e =>
        [-1, 0].includes(blockchain.compareVersions(e.returnValues.version, version))
    );
    if (filteredEvents.length > 0) {
        const maxObj = filteredEvents.reduce((prev, current) =>
            blockchain.compareVersions(prev.returnValues.version,
                current.returnValues.version) === 1
                ? prev
                : current
        );
        return maxObj.returnValues.value;
    } else {
        return null;
    }
};

blockchain.getKeyValue = async (
    identity,
    key,
    version = 'latest',
    versionSearchStrategy = 'exact'
) => {
    try {
        if (typeof identity !== 'string')
            throw Error('blockchain.getKeyValue(): identity must be a string');
        if (typeof key !== 'string') throw Error('blockchain.getKeyValue(): key must be a string');
        if (typeof version !== 'string')
            throw Error('blockchain.getKeyValue(): version must be a string');

        identity = identity.replace('.point', ''); // todo: rtrim instead

        if (version === 'latest') {
            const contract = await blockchain.loadIdentityContract();
            const result = await contract.methods.ikvGet(identity, key).call();
            return result;
        } else {
            if (versionSearchStrategy === 'exact') {
                const filter = {identity: identity, key: key, version: version};
                const events = await blockchain.getPastEvents('@', 'Identity', 'IKVSet', {
                    filter,
                    fromBlock: 0,
                    toBlock: 'latest'
                });
                if (events.length > 0) {
                    return events[0].returnValues.value;
                } else {
                    return null;
                }
            } else if (versionSearchStrategy === 'equalOrBefore') {
                const filter = {identity: identity, key: key};
                const events = await blockchain.getPastEvents('@', 'Identity', 'IKVSet', {
                    filter,
                    fromBlock: 0,
                    toBlock: 'latest'
                });
                const value = blockchain.getLastVersionOrBefore(version, events);
                return value;
            } else {
                return null;
            }
        }
    } catch (e) {
        log.error({error: e, stack: e.stack, identity, key, version}, 'getKeyValue error');
        throw e;
    }
};

blockchain.putKeyValue = async (identity, key, value, version) => {
    try {
        // todo: only send transaction if it's different. if it's already the same value, no need
        identity = identity.replace('.point', ''); // todo: rtrim instead
        const contract = await blockchain.loadIdentityContract();
        const method = contract.methods.ikvPut(identity, key, value, version);
        log.debug({identity, key, value, version}, 'Ready to put key value');
        await blockchain.web3send(method);
    } catch (e) {
        log.error({error: e, stack: e.stack, identity, key, value, version}, 'putKeyValue error');
        throw e;
    }
};

blockchain.registerIdentity = async (identity, address, commPublicKey) => {
    try {
        if (!Buffer.isBuffer(commPublicKey))
            throw Error('registerIdentity: commPublicKey must be a buffer');
        if (Buffer.byteLength(commPublicKey) !== 64)
            throw Error('registerIdentity: commPublicKey must be 64 bytes');
        // todo: validate identity and address

        identity = identity.replace('.point', ''); // todo: rtrim instead
        const contract = await blockchain.loadIdentityContract();
        log.debug(
            {address: contract.options.address},
            '@@@ Loaded "identity contract" successfully'
        );

        const method = contract.methods.register(
            identity,
            address,
            `0x${commPublicKey.slice(0, 32).toString('hex')}`,
            `0x${commPublicKey.slice(32).toString('hex')}`
        );

        log.debug({identity, address}, 'Registering identity');
        const result = await blockchain.web3send(method);
        log.info(result, 'Identity registration result');
        log.sendMetric({
            identityRegistration: {
                identity,
                address,
                commPublicKey
            }
        });

        return result;
    } catch (e) {
        log.error(
            {error: e, stack: e.stack, identity, address, commPublicKey},
            'Identity registration error'
        );

        throw e;
    }
};

blockchain.isCurrentIdentityRegistered = async () => {
    const address = getNetworkAddress();
    const identity = await blockchain.identityByOwner(address);
    if (
        !identity ||
        identity.replace('0x', '').toLowerCase() === address.replace('0x', '').toLowerCase()
    )
        return false;
    return true;
};

blockchain.getCurrentIdentity = async () => {
    const address = getNetworkAddress();
    return await blockchain.identityByOwner(address);
};

blockchain.toChecksumAddress = async address => {
    const checksumAddress = web3.utils.toChecksumAddress(address);
    return checksumAddress;
};

blockchain.sendTransaction = async ({from, to, value, gas}) => {
    const receipt = await web3.eth.sendTransaction({
        from,
        to,
        value,
        gas
    });
    return receipt;
};

blockchain.getBalance = async address => {
    const balance = await web3.eth.getBalance(address);
    return balance;
};

blockchain.getWallet = () => web3.eth.accounts.wallet[0];

blockchain.createAccountAndAddToWallet = () => {
    const account = web3.eth.accounts.create(web3.utils.randomHex(32));
    const wallet = web3.eth.accounts.wallet.add(account);
    return wallet;
};

/** Returns the wallet using the address in the loaded keystore */
blockchain.decryptWallet = (keystore, passcode) => {
    const decryptedWallets = web3.eth.accounts.wallet.decrypt([keystore], passcode);
    const address = ethereumjs.addHexPrefix(keystore.address);
    return decryptedWallets[address];
};

// from: https://ethereum.stackexchange.com/questions/2531/common-useful-javascript-snippets-for-geth/3478#3478
blockchain.getTransactionsByAccount = async (account, startBlockNumber, endBlockNumber) => {
    if (endBlockNumber == null) {
        endBlockNumber = await web3.eth.getBlockNumber();
        log.debug({endBlockNumber}, 'Using endBlockNumber');
    }
    if (startBlockNumber == null) {
        startBlockNumber = Math.max(0, endBlockNumber - 1000000);
        log.debug({startBlockNumber}, 'Using startBlockNumber');
    }
    log.debug(
        {account, startBlockNumber, endBlockNumber, ethblocknumber: web3.eth.blockNumber},
        'Searching for transactions'
    );

    const txs = [];

    for (var i = startBlockNumber; i <= endBlockNumber; i++) {
        if (i % 1000 === 0) {
            log.debug('Searching block ' + i);
        }

        var block = web3.eth.getBlock(i, true);
        if (block != null && block.transactions != null) {
            block.transactions.forEach(function(e) {
                if (account === '*' || account === e.from || account === e.to) {
                    txs.push(e);
                    // log.debug('   tx hash         : ' + e.hash + '\n'
                    //         + '   nonce           : ' + e.nonce + '\n'
                    //         + '   blockHash       : ' + e.blockHash + '\n'
                    //         + '   blockNumber     : ' + e.blockNumber + '\n'
                    //         + '   transactionIndex: ' + e.transactionIndex + '\n'
                    //         + '   from            : ' + e.from + '\n'
                    //         + '   to              : ' + e.to + '\n'
                    //         + '   value           : ' + e.value + '\n'
                    //         + '   time            : ' + block.timestamp + ' ' + new Date(block.timestamp * 1000).toGMTString() + '\n'
                    //         + '   gasPrice        : ' + e.gasPrice + '\n'
                    //         + '   gas             : ' + e.gas + '\n'
                    //         + '   input           : ' + e.input);
                }
            });
        }

        log.debug({txs}, 'Accound transactions');
    }

    return txs;
};

blockchain.getOwner = () => web3.utils.toChecksumAddress(getNetworkAddress());

blockchain.getGasPrice = async () => {
    const gasPrice = await web3.eth.getGasPrice();
    return gasPrice;
};

blockchain.getContractFromAbi = abi => new web3.eth.Contract(abi);

blockchain.deployContract = async (contract, artifacts, contractName) => {
    const deploy = contract.deploy({data: artifacts.evm.bytecode.object});
    const gasPrice = await blockchain.getGasPrice();
    const estimate = await deploy.estimateGas();
    const tx = await deploy.send({
        from: blockchain.getOwner(),
        gasPrice,
        gas: Math.floor(estimate * 1.1)
    });
    const address = tx.options && tx.options.address;
    log.debug({contractName, address}, 'Deployed Contract Instance');
    return address;
};

module.exports = blockchain;
