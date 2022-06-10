const path = require('path');
const {ethers} = require('ethers');
const ethereumjs = require('ethereumjs-util');
const {promises: fs} = require('fs');
const _ = require('lodash');
const {getFile, getJSON} = require('../../client/storage');
const ZDNS_ROUTES_KEY = 'zdns/routes';
const retryableErrors = {ESOCKETTIMEDOUT: 1};
const config = require('config');
const logger = require('../../core/log');
const log = logger.child({module: 'EthereumProvider'});
const {getNetworkPrivateKey, getNetworkAddress} = require('../../wallet/keystore');
const {statAsync, resolveHome, compileAndSaveContract, escapeString} = require('../../util');
const {createCache} = require('../../util/cache');

function isRetryableError({message}) {
    for (const code in retryableErrors) {
        if (RegExp(code).test(message)) {
            return true;
        }
    }
    return false;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function getContractInstance(address, abi) {
    const {provider, wallet} = getWeb3();
    const contract = new ethers.Contract(address, abi, provider).connect(wallet);
    return contract;
}

function createWeb3Instance({blockchainUrl, privateKey}) {
    const provider = blockchainUrl.startsWith('ws://')
        ? new ethers.providers.WebSocketProvider(blockchainUrl)
        : new ethers.providers.JsonRpcProvider(blockchainUrl);

    // provider.pollingInterval = 30000;

    const wallet = new ethers.Wallet(privateKey, provider);

    log.debug({blockchainUrl}, 'Created ethers instance');

    return {wallet, provider};
}

const abisByContractName = {};

const web3CallRetryLimit = config.get('network.web3_call_retry_limit');

const networks = config.get('network.web3');

const providers = {
    ynet: createWeb3Instance({
        blockchainUrl: networks.ynet.address,
        privateKey: '0x' + getNetworkPrivateKey()
    })
};

const getWeb3 = (chain = 'ynet') => {
    if (
        !Object.keys(networks)
            .filter(key => networks[key].type === 'eth')
            .includes(chain)
    ) {
        throw new Error(`No Eth provider for network ${chain}`);
    }

    if (!providers[chain]) {
        providers[chain] = createWeb3Instance({
            blockchainUrl: networks[chain].address,
            privateKey: '0x' + getNetworkPrivateKey()
        });
    }

    return providers[chain];
};

// Client that consolidates all blockchain-related functionality
const ethereum = {};

ethereum.loadPointContract = async (
    contractName,
    at,
    basepath = path.resolve(__dirname, '..', '..')
) => {
    if (!(contractName in abisByContractName)) {
        const buildDirPath = path.resolve(
            resolveHome(config.get('datadir')),
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
                    const contract = getContractInstance(at, abisByContractName[contractName]);
                    return contract;
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

    return getContractInstance(at, abisByContractName[contractName]);
};

ethereum.loadIdentityContract = async () => {
    const at = config.get('network.identity_contract_address');
    log.debug({address: at}, 'Identity contract address');
    return await ethereum.loadPointContract('Identity', at);
};

ethereum.loadWebsiteContract = async (target, contractName, version = 'latest') => {
    // todo: make it nicer, extend to all potential contracts, and add to docs
    // @ means internal contract for Point Network (truffle/contracts)
    if ((target === '@' || target === 'point') && contractName === 'Identity') {
        return ethereum.loadIdentityContract();
    }

    const at = await ethereum.getKeyValue(
        target,
        'zweb/contracts/address/' + contractName,
        version,
        'equalOrBefore'
    );
    const abi_storage_id = await ethereum.getKeyValue(
        target,
        'zweb/contracts/abi/' + contractName,
        version,
        'equalOrBefore'
    );

    let abi;
    try {
        abi = await getJSON(abi_storage_id); // todo: verify result, security, what if fails
        // todo: cache the result, because contract's abi at this specific address won't change (i think? check.)

        return getContractInstance(at, abi.abi);
    } catch (e) {
        throw Error(
            'Could not read abi of the contract ' +
                escapeString(contractName) +
                '. Reason: ' +
                e +
                '. If you are the website developer, are you sure you have specified in point.deploy.json config that you want this contract to be deployed?'
        );
    }
};

ethereum.web3send = async (contract, method, params, options = {}) => {
    let account, gasPrice;
    let {gasLimit, amountInWei} = options;
    let attempt = 0;
    let requestStart;

    while (true) {
        try {
            const {provider, wallet} = getWeb3();
            account = wallet.address;
            gasPrice = await provider.getGasPrice();
            log.debug(
                {gasLimit, gasPrice, account, method},
                'Prepared to send tx to contract method'
            );
            // if (!gasLimit) {
            gasLimit = await contract.estimateGas[method](...params, {value: amountInWei});
            log.debug({gasLimit, gasPrice}, 'Web3 Send gas estimate');
            // }
            requestStart = Date.now();
            const tx = await contract[method](...params, {
                gasPrice,
                gasLimit,
                value: amountInWei
            });
            const receipt = await tx.wait();
            return receipt;
        } catch (error) {
            log.error(
                {
                    method,
                    account,
                    gasPrice,
                    gasLimit,
                    options,
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
};

ethereum.callContract = async (target, contractName, method, params, version = 'latest') => {
    // todo: multiple arguments, but check existing usage // huh?
    let attempt = 0;
    log.debug({target, contractName, method, params}, 'Contract Call');
    while (true) {
        try {
            const contract = await ethereum.loadWebsiteContract(target, contractName, version);
            if (!Array.isArray(params)) {
                throw Error('Params sent to callContract is not an array');
            }

            if (!contract.methods[method]) {
                throw Error('Method ' + method + ' does not exist on contract ' + contractName); // todo: sanitize
            }

            const result = await contract.callStatic[method](...params);

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

ethereum.getPastEvents = async (
    target,
    contractName,
    event,
    options = {fromBlock: 0, toBlock: 'latest', filter: {}}
) => {
    const {fromBlock, toBlock, filter} = options;
    const contract = await ethereum.loadWebsiteContract(target, contractName);
    const bloomFilter = contract.filters[event]();

    let events = await contract.queryFilter(bloomFilter, fromBlock, toBlock);

    //filter non-indexed properties from return value for convenience
    if (Object.keys(filter).length > 0) {
        for (const k in filter) {
            events = events.filter(e => e.args[k] === filter[k]);
        }
    }

    return events;
};

ethereum.getBlockNumber = async () => {
    const {provider} = getWeb3();
    const n = await provider.getBlockNumber();
    return n;
};

ethereum.getBlockTimestamp = async blockNumber => {
    const {provider} = getWeb3();
    const block = await provider.getBlock(blockNumber);
    return block.timestamp;
};

ethereum.subscribeContractEvent = async (
    target,
    contractName,
    event,
    onEvent
    // onStart
    // options = {}
) => {
    const key = `${target}-${contract}-${event}`;
    if (!eventsSubscriptions[key]) {
        eventsSubscriptions[key] = [];
    }

    const contract = await ethereum.loadWebsiteContract(target, contractName);

    const subscriptionId = contract.listenerCount(event)++;

    return contract.on(event, data => onEvent({subscriptionId, data}));

    /*
    return contract.events[event](options)
        .on('data', data => onEvent({subscriptionId, data}))
        .on('connected', id => {
            const message = `Subscribed to "${contractName}" contract "${event}" events with subscription id: ${id}`;
            onStart({
                subscriptionId: (subscriptionId = id),
                data: {message}
            });
        });
    */
};

ethereum.removeSubscriptionById = async (subscriptionId, onRemove) => {
    // TODO: FIX
    // await getWeb3().eth.removeSubscriptionById(subscriptionId);
    return onRemove({
        subscriptionId,
        data: {message: `Unsubscribed from subscription id: ${subscriptionId}`}
    });
};

ethereum.sendToContract = async (
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
    const contract = await ethereum.loadWebsiteContract(target, contractName);

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
    return ethereum.web3send(contract, methodName, params, options);
};

ethereum.identityByOwner = async owner => {
    try {
        const identityContract = await ethereum.loadIdentityContract();
        return await identityContract.getIdentityByOwner(owner);
    } catch (e) {
        log.error({owner}, 'Error: identityByOwner');
        throw e;
    }
};

ethereum.ownerByIdentity = async identity => {
    try {
        const identityContract = await ethereum.loadIdentityContract();
        return await identityContract.getOwnerByIdentity(identity);
    } catch (e) {
        log.error({identity}, 'Error: ownerByIdentity');
        throw e;
    }
};

ethereum.commPublicKeyByIdentity = async identity => {
    try {
        const identityContract = await ethereum.loadIdentityContract();
        const parts = await identityContract.getCommPublicKeyByIdentity(identity);
        return '0x' + parts.part1.replace('0x', '') + parts.part2.replace('0x', '');
        // todo: make damn sure it didn't return something silly like 0x0 or 0x by mistake
    } catch (e) {
        log.error('Error: commPublicKeyByIdentity', {identity});
    }
};

ethereum.isIdentityDeployer = async (identity, address) => {
    try {
        const identityContract = await ethereum.loadIdentityContract();
        return await identityContract.isIdentityDeployer(identity, address);
    } catch (e) {
        log.error({address}, 'Error: isIdentityDeployer');
        throw e;
    }
};

const zRecordCache = createCache();

ethereum.getZRecord = async (domain, version = 'latest') => {
    domain = domain.replace('.point', ''); // todo: rtrim instead
    return zRecordCache.get(`${domain}-${ZDNS_ROUTES_KEY}-${version}`, async () => {
        const result = await ethereum.getKeyValue(domain, ZDNS_ROUTES_KEY, version);
        return result?.substr(0, 2) === '0x' ? result.substr(2) : result;
    });
};

ethereum.putZRecord = async (domain, routesFile, version) => {
    domain = domain.replace('.point', ''); // todo: rtrim instead
    return await ethereum.putKeyValue(domain, ZDNS_ROUTES_KEY, routesFile, version);
};

ethereum.getKeyLastVersion = async (identity, key) => {
    const filter = {identity: identity, key: key};
    const events = await ethereum.getPastEvents('@', 'Identity', 'IKVSet', {
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

ethereum.compareVersions = (v1, v2) => {
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

ethereum.getLastVersionOrBefore = (version, events) => {
    const filteredEvents = events.filter(e =>
        [-1, 0].includes(ethereum.compareVersions(e.returnValues.version, version))
    );
    if (filteredEvents.length > 0) {
        const maxObj = filteredEvents.reduce((prev, current) =>
            ethereum.compareVersions(prev.returnValues.version, current.returnValues.version) === 1
                ? prev
                : current
        );
        return maxObj.returnValues.value;
    } else {
        return null;
    }
};

const keyValueCache = createCache();

ethereum.getKeyValue = async (
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
        const baseKey = `${identity}-${key}`;
        if (version === 'latest') {
            return keyValueCache.get(baseKey, async () => {
                const contract = await ethereum.loadIdentityContract();
                return contract.ikvGet(identity, key);
            });
        } else {
            const cacheKey = `${baseKey}-${version}`;
            if (versionSearchStrategy === 'exact') {
                return keyValueCache.get(cacheKey, async () => {
                    const filter = {identity: identity, key: key, version: version};
                    const events = await ethereum.getPastEvents('@', 'Identity', 'IKVSet', {
                        filter,
                        fromBlock: 0,
                        toBlock: 'latest'
                    });
                    return events.length > 0 ? events[0].returnValues.value : null;
                });
            } else if (versionSearchStrategy === 'equalOrBefore') {
                return keyValueCache.get(cacheKey, async () => {
                    const filter = {identity: identity, key: key};
                    const events = await ethereum.getPastEvents('@', 'Identity', 'IKVSet', {
                        filter,
                        fromBlock: 0,
                        toBlock: 'latest'
                    });
                    return ethereum.getLastVersionOrBefore(version, events);
                });
            } else {
                return null;
            }
        }
    } catch (e) {
        log.error({error: e, stack: e.stack, identity, key, version}, 'getKeyValue error');
        throw e;
    }
};

ethereum.putKeyValue = async (identity, key, value, version) => {
    try {
        // todo: only send transaction if it's different. if it's already the same value, no need
        identity = identity.replace('.point', ''); // todo: rtrim instead
        const contract = await ethereum.loadIdentityContract();
        log.debug({identity, key, value, version}, 'Ready to put key value');
        await ethereum.web3send(contract, 'ikvPut', [identity, key, value, version]);
        keyValueCache.delStartWith(`${identity}-${key}`);
    } catch (e) {
        log.error({error: e, stack: e.stack, identity, key, value, version}, 'putKeyValue error');
        throw e;
    }
};

ethereum.registerVerified = async (identity, address, commPublicKey, hashedMessage, {s, r, v}) => {
    try {
        if (!Buffer.isBuffer(commPublicKey))
            throw Error('registerIdentity: commPublicKey must be a buffer');
        if (Buffer.byteLength(commPublicKey) !== 64)
            throw Error('registerIdentity: commPublicKey must be 64 bytes');
        // todo: validate identity and address

        identity = identity.replace('.point', ''); // todo: rtrim instead
        const contract = await ethereum.loadIdentityContract();
        log.debug({address: contract.options.address}, 'Loaded "identity contract" successfully');

        log.debug({identity, address}, 'Registering identity');
        const result = await ethereum.web3send(contract, 'registerVerified', [
            identity,
            address,
            `0x${commPublicKey.slice(0, 32).toString('hex')}`,
            `0x${commPublicKey.slice(32).toString('hex')}`,
            hashedMessage,
            v,
            r,
            s
        ]);
        log.info(result, 'Identity registration result');
        log.sendMetric({
            identityRegistration: {
                identity,
                address,
                commPublicKeyz
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

ethereum.registerIdentity = async (identity, address, commPublicKey) => {
    try {
        if (!Buffer.isBuffer(commPublicKey))
            throw Error('registerIdentity: commPublicKey must be a buffer');
        if (Buffer.byteLength(commPublicKey) !== 64)
            throw Error('registerIdentity: commPublicKey must be 64 bytes');
        // todo: validate identity and address

        identity = identity.replace('.point', ''); // todo: rtrim instead
        const contract = await ethereum.loadIdentityContract();
        log.debug({address: contract.address}, 'Loaded "identity contract" successfully');

        log.debug({identity, address}, 'Registering identity');
        const result = await ethereum.web3send(contract, 'register', [
            identity,
            address,
            `0x${commPublicKey.slice(0, 32).toString('hex')}`,
            `0x${commPublicKey.slice(32).toString('hex')}`
        ]);
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

ethereum.isCurrentIdentityRegistered = async () => {
    const address = getNetworkAddress();
    const identity = await ethereum.identityByOwner(address);
    if (
        !identity ||
        identity.replace('0x', '').toLowerCase() === address.replace('0x', '').toLowerCase()
    )
        return false;
    return true;
};

ethereum.getCurrentIdentity = async () => {
    const address = getNetworkAddress();
    return await ethereum.identityByOwner(address);
};

ethereum.toChecksumAddress = async address => {
    // const checksumAddress = getWeb3().utils.toChecksumAddress(address);
    const checksumAddress = ethers.utils.getAddress(address);
    return checksumAddress;
};

ethereum.sendContractTransaction = async ({from, to, value, gas}) => {
    // TODO: GET NONCE, SIGN AND SEND TRANSACTION
    const receipt = await getWeb3().eth.sendTransaction({
        from,
        to,
        value,
        gas
    });
    return receipt;
};

ethereum.getBalance = async ({address, blockIdentifier = 'latest', network}) =>
    getWeb3(network).provider.getBalance(address, blockIdentifier);

// ethereum.getWallet = () => getWeb3().eth.accounts.wallet[0];
ethereum.getWallet = () => getWeb3().wallet;

ethereum.createAccountAndAddToWallet = () => {
    const wallet = new ethers.Wallet.createRandom();
    // TODO: add to accounts
    // const account = getWeb3().eth.accounts.create(getWeb3().utils.randomHex(32));
    // const wallet = getWeb3().eth.accounts.wallet.add(account);
    return wallet;
};

/** Returns the wallet using the address in the loaded keystore */
ethereum.decryptWallet = (keystore, passcode) => {
    // TODO: Fix
    const decryptedWallets = getWeb3().eth.accounts.wallet.decrypt([keystore], passcode);
    const address = ethereumjs.addHexPrefix(keystore.address);
    return decryptedWallets[address];
};

// from: https://ethereum.stackexchange.com/questions/2531/common-useful-javascript-snippets-for-geth/3478#3478
ethereum.getTransactionsByAccount = async ({
    account,
    startBlockNumber = null,
    endBlockNumber = null,
    network
}) => {
    const {provider} = getWeb3(network);
    const ethBlockNumber = await provider.getBlockNumber();
    if (endBlockNumber == null) {
        endBlockNumber = ethBlockNumber;
        log.debug({endBlockNumber}, 'Using endBlockNumber');
    }
    if (startBlockNumber == null) {
        startBlockNumber = Math.max(0, endBlockNumber - 1000000);
        log.debug({startBlockNumber}, 'Using startBlockNumber');
    }

    log.debug(
        {account, startBlockNumber, endBlockNumber, ethBlockNumber},
        'Searching for transactions'
    );

    const txs = [];

    for (let i = startBlockNumber; i <= endBlockNumber; i++) {
        if (i % 1000 === 0) {
            log.debug('Searching block ' + i);
        }

        const block = await provider.getBlock(i);
        if (block != null && block.transactions != null) {
            block.transactions.forEach(function(e) {
                if (account === '*' || account === e.from || account === e.to) {
                    txs.push(e);
                }
            });
        }

        log.debug({txs}, 'Account transactions');
    }

    return txs;
};

ethereum.getOwner = () => ethers.utils.getAddress(getNetworkAddress());

ethereum.getGasPrice = async () => {
    const gasPrice = await getWeb3().provider.getGasPrice();
    return gasPrice;
};

ethereum.getContractFromAbi = abi => {
    // TODO: Verify that this works without an address (new ethers.Contract(address, abi))
    const contract = new ethers.Contract(abi);
    return contract;
};

// TODO: Verify that this is still working
ethereum.deployContract = async (contract, artifacts, contractName) => {
    const deploy = contract.deploy({data: artifacts.evm.bytecode.object});
    const gasPrice = await ethereum.getGasPrice();
    const estimate = await deploy.estimateGas();
    const tx = await deploy.send({
        from: ethereum.getOwner(),
        gasPrice,
        gas: Math.floor(estimate * 1.1)
    });
    const address = tx.options && tx.options.address;
    log.debug({contractName, address}, 'Deployed Contract Instance');
    return address;
};

ethereum.toHex = n => getWeb3().utils.toHex(n);

ethereum.send = ({method, params = [], id, network}) =>
    new Promise((resolve, reject) => {
        getWeb3(network).provider.send(
            {
                id,
                method,
                params,
                jsonrpc: '2.0'
            },
            (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            }
        );
    });

ethereum.resolveDomain = async (domainName, network = 'rinkeby') => {
    const {provider} = getWeb3(network);
    const resolver = await provider.getResolver(domainName);

    const [owner, content] = await Promise.all([
        provider.resolveName(domainName),
        resolver.getText('point')
    ]);

    return {owner, content};
};

module.exports = ethereum;
