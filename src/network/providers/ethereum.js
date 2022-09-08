const path = require('path');
const Web3 = require('web3');
const {ethers} = require('ethers');
const ethereumjs = require('ethereumjs-util');
const {promises: fs} = require('fs');
const _ = require('lodash');
const HDWalletProvider = require('@truffle/hdwallet-provider');
const NonceTrackerSubprovider = require('web3-provider-engine/subproviders/nonce-tracker');
const namehash = require('@ensdomains/eth-ens-namehash');
const {getFile, getJSON} = require('../../client/storage');
const ZDNS_ROUTES_KEY = 'zdns/routes';
const retryableErrors = {ESOCKETTIMEDOUT: 1};
const config = require('config');
const logger = require('../../core/log');
const log = logger.child({module: 'EthereumProvider'});
const {getNetworkPrivateKey, getNetworkAddress} = require('../../wallet/keystore');
const {statAsync, resolveHome, compileAndSaveContract, escapeString} = require('../../util');
const {createCache} = require('../../util/cache');
const {ETH_RESOLVER_ABI} = require('../../name_service/abis/resolver');
const {POINT_ENS_TEXT_RECORD_KEY} = require('../../name_service/constants');
const {hashFn} = require('../../util');
const {Op} = require('sequelize');
const Event = require('../../db/models/event').default;
const EventScan = require('../../db/models/event_scan').default;

function isRetryableError({message}) {
    for (const code in retryableErrors) {
        if (RegExp(code).test(message)) {
            return true;
        }
    }
    return false;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const web3CallRetryLimit = config.get('network.web3_call_retry_limit');
const networks = config.get('network.web3');
const DEFAULT_NETWORK = config.get('network.default_network');
const CONTRACT_BUILD_DIR = path.resolve(
    resolveHome(config.get('datadir')),
    config.get('network.contracts_path')
);

function createWeb3Instance({protocol, network}) {
    const blockchainUrl = networks[network][protocol === 'ws' ? 'ws_address' : 'http_address'];
    const tls = networks[network].tls;
    const privateKey = '0x' + getNetworkPrivateKey();
    const url = `${protocol}${tls ? 's' : ''}://${blockchainUrl}`;
    const provider = protocol === 'ws' ? new Web3.providers.WebsocketProvider(url) : url;

    if (protocol === 'ws') {
        HDWalletProvider.prototype.on = provider.on.bind(provider);
    }

    const hdWalletProvider = new HDWalletProvider({
        privateKeys: [privateKey],
        providerOrUrl: provider,
        pollingInterval: 30000
    });
    const nonceTracker = new NonceTrackerSubprovider();

    hdWalletProvider.engine._providers.unshift(nonceTracker);
    nonceTracker.setEngine(hdWalletProvider.engine);

    const web3 = new Web3(hdWalletProvider);
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);

    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    log.debug({url}, 'Created web3 instance');
    return web3;
}

const abisByContractName = {};

// web3.js providers
const providers = {
    [DEFAULT_NETWORK]: {
        http: createWeb3Instance({
            protocol: 'http',
            network: DEFAULT_NETWORK
        })
    }
};

const getWeb3 = ({chain = DEFAULT_NETWORK, protocol = 'http'} = {}) => {
    if (
        !Object.keys(networks)
            .filter(key => networks[key].type === 'eth')
            .includes(chain)
    ) {
        throw new Error(`No Eth provider for network ${chain}`);
    }
    if (!providers[chain]) {
        providers[chain] = {};
    }
    if (!providers[chain][protocol]) {
        providers[chain][protocol] = createWeb3Instance({
            protocol,
            network: chain
        });
    }
    return providers[chain][protocol];
};

// ethers providers
const ethersProviders = {};

const getEthers = (chain = DEFAULT_NETWORK) => {
    if (!networks[chain] || !networks[chain].http_address) {
        throw new Error(`No connection details for chain "${chain}".`);
    }

    if (!ethersProviders[chain]) {
        const host = networks[chain].http_address;
        const protocol = networks[chain].tls ? 'https' : 'http';
        const url = `${protocol}://${host}`;
        ethersProviders[chain] = new ethers.providers.JsonRpcProvider(url);
    }

    return ethersProviders[chain];
};

const isIdentityAbiRelevant = async () => {
    const abiPath = path.resolve(CONTRACT_BUILD_DIR, 'Identity.json');
    const abiFileHash = config.get('identity_contract_id');

    try {
        const abiAndMetadata = JSON.parse(await fs.readFile(abiPath));
        const {updatedAt} = abiAndMetadata;

        log.debug(
            {
                abiPath,
                abiFileHash,
                preservedAbiFileHash: abiAndMetadata.abiFileHash || null,
                updatedAt: (isFinite(updatedAt) && new Date(updatedAt).toISOString()) || null
            },
            'Checking identity abi relevance'
        );

        return abiAndMetadata.abiFileHash === abiFileHash;
    } catch (e) {
        log.error(
            {
                error: e.message,
                stack: e.stack,
                abiPath,
                abiFileHash
            },
            'Failed to check identity abi relevance'
        );

        return false;
    }
};

const fetchAndSaveIdentityAbiFromStorage = async () => {
    const abiFileHash = config.get('identity_contract_id');
    const abiPath = path.resolve(CONTRACT_BUILD_DIR, 'Identity.json');

    log.debug({abiFileHash}, 'Fetching Identity contract from storage');

    try {
        const abiFile = await getFile(abiFileHash);
        const abiAndMetadata = JSON.parse(abiFile);

        abiAndMetadata.abiFileHash = abiFileHash;
        abiAndMetadata.updatedAt = Date.now();

        await fs.writeFile(abiPath, JSON.stringify(abiAndMetadata));

        log.debug('Successfully fetched identity contract abi from storage');

        return (abisByContractName['Identity'] = abiAndMetadata);
    } catch (e) {
        log.error(
            {
                error: e.message,
                stack: e.stack,
                abiFileHash,
                localAbiPath: abiPath
            },
            'Failed to fetch identity abi from storage'
        );
    }
};

// Client that consolidates all blockchain-related functionality
const ethereum = {};

ethereum.loadPointContract = async (
    contractName,
    at,
    basepath = path.resolve(__dirname, '..', '..')
) => {
    if (!(contractName in abisByContractName)) {
        const abiFileName = path.resolve(CONTRACT_BUILD_DIR, contractName + '.json');

        try {
            await statAsync(abiFileName);
        } catch (e) {
            log.debug({contractName, at}, `Abi is not found locally, compiling`);

            const contractPath = path.resolve(basepath, '..', 'hardhat', 'contracts');
            await compileAndSaveContract({
                name: contractName,
                contractPath,
                buildDirPath: CONTRACT_BUILD_DIR
            });

            log.debug('Identity contract successfully compiled');
        }

        const abiFile = JSON.parse(await fs.readFile(abiFileName, 'utf8'));

        abisByContractName[contractName] = abiFile;
    }

    const web3 = getWeb3();
    return new web3.eth.Contract(abisByContractName[contractName].abi, at);
};

ethereum.loadIdentityContract = async () => {
    const mode = config.get('mode');

    if (mode !== 'e2e' && mode !== 'zappdev') {
        const isAbiRelevant = await isIdentityAbiRelevant();

        if (!isAbiRelevant) {
            await fetchAndSaveIdentityAbiFromStorage();
        }
    }

    const address = config.get('network.identity_contract_address');
    log.debug({address}, 'Identity contract address');

    return await ethereum.loadPointContract('Identity', address);
};

ethereum.loadWebsiteContract = async (
    target,
    contractName,
    version = 'latest',
    protocol = 'http'
) => {
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
        const web3 = getWeb3({protocol});
        return new web3.eth.Contract(abi.abi, at);
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

ethereum.web3send = async (method, optons = {}) => {
    let account, gasPrice;
    let {gasLimit, amountInWei} = optons;
    let attempt = 0;
    let requestStart;

    while (true) {
        try {
            account = getWeb3().eth.defaultAccount;
            gasPrice = await ethereum.getGasPrice();
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
                .on('error', (error, receipt) => {
                    log.debug(
                        {error, receipt, method: method._method.name},
                        'error sending tx to contract method'
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

ethereum.callContract = async (target, contractName, method, params, version = 'latest') => {
    // todo: multiple arguments, but check existing usage // huh?
    let attempt = 0;
    log.trace({target, contractName, method, params}, 'Contract Call');
    while (true) {
        try {
            const contract = await ethereum.loadWebsiteContract(target, contractName, version);
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

const _performScanForContractEvents = async (
    contract,
    contract_address,
    chain_id,
    fromBlock,
    toBlock
) => {
    log.debug({fn: '_performScanForContractEvents', contract_address, fromBlock, toBlock});

    const event_name = null;
    const events = await contract.getPastEvents(event_name, {
        fromBlock: fromBlock,
        toBlock: toBlock
    });

    for (const event of events) {
        const id = hashFn(
            new Buffer(contract_address + '_' + event.id + '_' + event.transactionHash)
        ).toString('hex');

        await Event.findByIdOrCreate(id, {
            id,
            raw_id: event.id,
            contract_address: contract_address,
            chain_id: chain_id,
            block_number: event.blockNumber,
            block_hash: event.blockHash,
            transaction_hash: event.transactionHash,
            transaction_index: event.transactionIndex,
            log_index: event.logIndex,
            removed: event.removed,
            return_values: event.returnValues,
            event: event.event,
            signature: event.signature,
            raw: event.raw,
            topic0: event.raw.topics[0] ? event.raw.topics[0] : null,
            topic1: event.raw.topics[1] ? event.raw.topics[1] : null,
            topic2: event.raw.topics[2] ? event.raw.topics[2] : null
        });
    }

    const id = contract_address + '_' + fromBlock + '_' + toBlock;
    await EventScan.findByIdOrCreate(id, {
        id,
        contract_address: contract_address,
        chain_id: chain_id,
        from_block: fromBlock,
        to_block: toBlock
    });
};

const _renewContractEventsCache = async (
    chain_id,
    contract,
    contract_address,
    queryFromBlock,
    queryToBlock
) => {
    // force to ints for security
    queryFromBlock = queryFromBlock + 0;
    queryToBlock = queryToBlock + 0;

    // make sure they're chronological, if not, swap
    if (queryFromBlock > queryToBlock) {
        [queryFromBlock, queryToBlock] = [queryToBlock, queryFromBlock];
    }

    // pull all possible existing scan ranges within reach
    const query = {
        where: {
            contract_address: contract_address,
            chain_id: chain_id,

            [Op.or]: [
                // include those with ending of the scanned range within our interval
                {
                    [Op.and]: [
                        {to_block: {[Op.gte]: queryFromBlock}},
                        {to_block: {[Op.lte]: queryToBlock}}
                    ]
                },
                // include those with beginning of the scanned range within our interval
                {
                    [Op.and]: [
                        {from_block: {[Op.gte]: queryFromBlock}},
                        {from_block: {[Op.lte]: queryToBlock}}
                    ]
                },
                // include those that are surrounding our interval completely
                {
                    [Op.and]: [
                        {from_block: {[Op.lte]: queryFromBlock}},
                        {from_block: {[Op.gte]: queryToBlock}}
                    ]
                }
            ]
        },
        order: [
            ['from_block', 'ASC'] // makes it chronological
        ]
    };
    const scanned_ranges = await EventScan.findAll(query);

    // push one "fake" range, so that the cycle goes one last time
    scanned_ranges.push({from_block: queryToBlock + 1, to_block: queryToBlock + 1, fake: true});

    let cursor = queryFromBlock;
    let max_scanned = 0;
    for (const range of scanned_ranges) {
        if (range.from_block <= cursor) {
            // the scanned range starts earlier or at the same time as our query beginning or scan_cursor
            // fast-forward
            cursor = Math.max(cursor, range.to_block + 1);
        } else {
            // our query starts earlier than this range, let's scan everything before it
            const cursor_end = range.from_block - 1;
            const range_length = cursor_end - cursor;
            if (range_length >= 0) {
                // don't scan negative ranges
                const PAGE_SIZE = Number(config.get('network.event_block_page_size'));
                for (let scan_from = cursor; scan_from <= cursor_end; scan_from += PAGE_SIZE) {
                    const scan_to = Math.min(queryToBlock, scan_from + PAGE_SIZE - 1, cursor_end);
                    await _performScanForContractEvents(
                        contract,
                        contract_address,
                        chain_id,
                        scan_from,
                        scan_to
                    );
                }
            }
            cursor = Math.max(cursor, range.to_block + 1);
        }
        max_scanned = !range.fake ? Math.max(max_scanned, range.to_block) : max_scanned;

        if (cursor > queryToBlock) break; // we're done, we're outside the query zone
    }

    // collapse them

    // we are guaranteed to have scanned queryFromBlock..max_scanned range
    // if there are more scanned ranges, collapse them
    const first_range = await EventScan.findOne();
    if (!first_range) return; // No ranges found by this query - just forget about it
    if (first_range.from_block === queryFromBlock && first_range.to_block === max_scanned) return; // already done

    first_range.from_block = Math.min(first_range.from_block, queryFromBlock);
    first_range.to_block = Math.max(first_range.to_block, max_scanned);
    await first_range.save();

    query.where['id'] = {[Op.ne]: first_range.id};
    await EventScan.destroy(query);
};

ethereum.getPaginatedPastEvents = async (target, contractName, event, options) => {
    const contract = await ethereum.loadWebsiteContract(target, contractName);
    const contract_address = contract._address;

    // make sure chain_id available, to not mix them
    const chain_id = DEFAULT_NETWORK;
    if (!chain_id) {
        throw new Error(`Chain ID is empty, don't know for which chain to save the events`);
    }

    // If filter contains an address, convert it to checksum.
    if (options.filter && options.filter.identityOwner) {
        options.filter.identityOwner = ethereum.toChecksumAddress(options.filter.identityOwner);
    }

    if (options.toBlock === 'latest') {
        const latestBlockNumber = await ethereum.getBlockNumber();
        options.toBlock = latestBlockNumber;
    }

    await _renewContractEventsCache(
        chain_id,
        contract,
        contract_address,
        options.fromBlock,
        options.toBlock
    );

    let events = await Event.fetchCachedEvents(chain_id, contract_address, event, options);

    // filter non-indexed properties from return value for convenience
    if (options.hasOwnProperty('filter') && Object.keys(options.filter).length > 0) {
        for (const k in options.filter) {
            events = events.filter(e => e.returnValues[k] === options.filter[k]);
        }
    }

    return events;
};

ethereum.getPastEvents = async (
    target,
    contractName,
    event,
    options = {fromBlock: 0, toBlock: 'latest'}
) => {
    const contract = await ethereum.loadWebsiteContract(target, contractName);

    // If filter contains an address, convert it to checksum.
    if (options.filter && options.filter.identityOwner) {
        options.filter.identityOwner = ethereum.toChecksumAddress(options.filter.identityOwner);
    }

    return await ethereum.getPaginatedPastEvents(target, contractName, event, options);

    const eventBlocksPageSize = 10000;
    let latestBlock = 0;
    if (options.toBlock === 'latest') {
        latestBlock = await getWeb3().eth.getBlockNumber();
    } else {
        latestBlock = options.toBlock;
    }

    const ranges = [];
    for (let start = options.fromBlock; start < latestBlock; start += eventBlocksPageSize) {
        ranges.push({
            fromBlock: start,
            toBlock:
                start + eventBlocksPageSize < latestBlock
                    ? start + eventBlocksPageSize
                    : latestBlock
        });
    }

    const eventsParts = await Promise.all(
        ranges.map(({fromBlock, toBlock}) =>
            contract.getPastEvents(event, {...options, fromBlock, toBlock})
        )
    );

    let events = [];
    for (const evPart of eventsParts) {
        events = events.concat(evPart);
    }

    //filter non-indexed properties from return value for convenience
    if (options.hasOwnProperty('filter') && Object.keys(options.filter).length > 0) {
        for (const k in options.filter) {
            events = events.filter(e => e.returnValues[k] === options.filter[k]);
        }
    }

    return events;
};

ethereum.getBlockNumber = async () => {
    try {
        const n = await getWeb3().eth.getBlockNumber();
        return n;
    } catch (e) {
        log.error(e, 'failed to fetch block number');
    }
};

ethereum.getBlockTimestamp = async blockNumber => {
    const block = await getWeb3().eth.getBlock(blockNumber);
    return block.timestamp;
};

ethereum.subscribeContractEvent = async (
    target,
    contractName,
    event,
    onEvent,
    onStart,
    options = {}
) => {
    const contract = await ethereum.loadWebsiteContract(target, contractName, undefined, 'ws');

    let subscriptionId;

    return contract.events[event](options)
        .on(
            'data',
            data => (log.debug({data}, 'Contract event received'), onEvent({subscriptionId, data}))
        )
        .on('connected', id => {
            const message = `Subscribed to "${contractName}" contract "${event}" events with subscription id: ${id}`;
            log.debug(
                {contractName, event, subscriptionId: id},
                'Contract event subscription started'
            );
            onStart({
                subscriptionId: (subscriptionId = id),
                data: {message}
            });
        })
        .on('error', e => log.error(e, 'Contract event subscription error'));
};

ethereum.removeSubscriptionById = async (subscriptionId, onRemove) => {
    await getWeb3().eth.removeSubscriptionById(subscriptionId);
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
    const method = contract.methods[methodName](...params);
    return ethereum.web3send(method, options);
};

ethereum.identityByOwner = async owner => {
    try {
        const identityContract = await ethereum.loadIdentityContract();
        const method = identityContract.methods.getIdentityByOwner(owner);
        return await method.call();
    } catch (e) {
        log.error({owner}, 'Error: identityByOwner');
        throw e;
    }
};

ethereum.ownerByIdentity = async identity => {
    try {
        const identityContract = await ethereum.loadIdentityContract();
        const method = identityContract.methods.getOwnerByIdentity(identity);
        return await method.call();
    } catch (e) {
        log.error({identity}, 'Error: ownerByIdentity');
        throw e;
    }
};

ethereum.commPublicKeyByIdentity = async identity => {
    try {
        const identityContract = await ethereum.loadIdentityContract();
        const method = identityContract.methods.getCommPublicKeyByIdentity(identity);
        const parts = await method.call();
        return '0x' + parts.part1.replace('0x', '') + parts.part2.replace('0x', '');
        // todo: make damn sure it didn't return something silly like 0x0 or 0x by mistake
    } catch (e) {
        log.error('Error: commPublicKeyByIdentity', {identity});
    }
};

ethereum.isIdentityDeployer = async (identity, address) => {
    try {
        const identityContract = await ethereum.loadIdentityContract();
        const method = identityContract.methods.isIdentityDeployer(identity, address);
        return await method.call();
    } catch (e) {
        log.error({address}, 'Error: isIdentityDeployer');
        throw e;
    }
};

const zRecordCache = createCache();

ethereum.getZRecord = async (domain, version = 'latest') => {
    domain = domain.replace('.point', ''); // todo: rtrim instead
    return zRecordCache.get(`${domain}-${ZDNS_ROUTES_KEY}-${version}`, async () => {
        const result = await ethereum.getKeyValue(domain, ZDNS_ROUTES_KEY, version, 'exact', true);
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

// Gets an ik version entry directly from the contract storage without using events
ethereum.getikVersion = async (identity, key) => {
    const identityContract = await ethereum.loadIdentityContract();
    const version = await identityContract.methods.ikVersionGet(identity, key).call();
    return version;
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
    versionSearchStrategy = 'exact',
    followCopyFromIkv = false
) => {
    // Process @@copy_from_ikv instruction if followCopyFromIkv is set to true
    if (followCopyFromIkv) {
        // self invoke to get the value first but without redirection
        const value = await ethereum.getKeyValue(
            identity,
            key,
            version,
            versionSearchStrategy,
            false
        );

        const copyFromIkv_prolog = '@@copy_from_ikv=';
        if (!value.startsWith(copyFromIkv_prolog)) {
            return value; // no redirection
        } else {
            // the format is:
            // @@copy_from_ikv=<identity>:<key_in_ikv>
            const withoutPrefix = value.substring(copyFromIkv_prolog.length);

            const copy_identity = withoutPrefix.split(':')[0];
            const copy_key = withoutPrefix
                .split(':')
                .slice(1)
                .join(':');

            const value = await ethereum.getKeyValue(
                copy_identity,
                copy_key,
                'latest',
                'exact',
                true
            );

            if (!value) {
                throw new Error(
                    `Failed to obtain ikv value following ${copyFromIkv_prolog} instruction`
                );
            }

            return value;
        }
    }

    // Get the value
    try {
        if (typeof identity !== 'string') {
            throw Error('blockchain.getKeyValue(): identity must be a string');
        }
        if (typeof key !== 'string') {
            throw Error('blockchain.getKeyValue(): key must be a string');
        }
        if (typeof version !== 'string') {
            throw Error('blockchain.getKeyValue(): version must be a string');
        }

        identity = identity.replace('.point', ''); // todo: rtrim instead
        const baseKey = `${identity}-${key}`;
        if (version === 'latest') {
            return keyValueCache.get(baseKey, async () => {
                const contract = await ethereum.loadIdentityContract();
                return contract.methods.ikvGet(identity, key).call();
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
        const method = contract.methods.ikvPut(identity, key, value, version);
        log.debug({identity, key, value, version}, 'Ready to put key value');
        await ethereum.web3send(method);
        keyValueCache.delStartWith(`${identity}-${key}`);
    } catch (e) {
        log.error({error: e, stack: e.stack, identity, key, value, version}, 'putKeyValue error');
        throw e;
    }
};

ethereum.registerVerified = async (identity, address, commPublicKey, hashedMessage, {s, r, v}) => {
    try {
        if (!Buffer.isBuffer(commPublicKey)) {
            throw Error('registerIdentity: commPublicKey must be a buffer');
        }
        if (Buffer.byteLength(commPublicKey) !== 64) {
            throw Error('registerIdentity: commPublicKey must be 64 bytes');
        }
        // todo: validate identity and address

        identity = identity.replace('.point', ''); // todo: rtrim instead
        const contract = await ethereum.loadIdentityContract();
        log.debug({address: contract.options.address}, 'Loaded "identity contract" successfully');

        const method = contract.methods.registerVerified(
            identity,
            address,
            `0x${commPublicKey.slice(0, 32).toString('hex')}`,
            `0x${commPublicKey.slice(32).toString('hex')}`,
            hashedMessage,
            v,
            r,
            s
        );

        log.debug({identity, address}, 'Registering identity');
        const result = await ethereum.web3send(method);
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

ethereum.registerIdentity = async (identity, address, commPublicKey) => {
    try {
        if (!Buffer.isBuffer(commPublicKey)) {
            throw Error('registerIdentity: commPublicKey must be a buffer');
        }
        if (Buffer.byteLength(commPublicKey) !== 64) {
            throw Error('registerIdentity: commPublicKey must be 64 bytes');
        }
        // todo: validate identity and address

        identity = identity.replace('.point', ''); // todo: rtrim instead
        const contract = await ethereum.loadIdentityContract();
        log.debug({address: contract.options.address}, 'Loaded "identity contract" successfully');

        const method = contract.methods.register(
            identity,
            address,
            `0x${commPublicKey.slice(0, 32).toString('hex')}`,
            `0x${commPublicKey.slice(32).toString('hex')}`
        );

        log.debug({identity, address}, 'Registering identity');
        const result = await ethereum.web3send(method);
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

ethereum.registerSubIdentity = async (subidentity, parentIdentity, address, commPublicKey) => {
    try {
        if (!Buffer.isBuffer(commPublicKey)) {
            throw Error('registerIdentity: commPublicKey must be a buffer');
        }
        if (Buffer.byteLength(commPublicKey) !== 64) {
            throw Error('registerIdentity: commPublicKey must be 64 bytes');
        }

        const contract = await ethereum.loadIdentityContract();
        log.debug({address: contract.options.address}, 'Loaded "identity contract" successfully');

        const method = contract.methods.registerSubidentity(
            subidentity,
            parentIdentity,
            address,
            `0x${commPublicKey.slice(0, 32).toString('hex')}`,
            `0x${commPublicKey.slice(32).toString('hex')}`
        );

        log.debug(
            {subidentity: `${subidentity}.${parentIdentity}`, address},
            'Registering subidentity'
        );
        const result = await ethereum.web3send(method);

        log.info(result, 'Subidentity registration result');
        log.sendMetric({
            subidentityRegistration: {
                subidentity: `${subidentity}.${parentIdentity}`,
                address,
                commPublicKey
            }
        });

        return result;
    } catch (e) {
        log.error(
            {
                error: e,
                stack: e.stack,
                subidentity: `${subidentity}.${parentIdentity}`,
                address,
                commPublicKey
            },
            'Subidentity registration error'
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
    ) {
        return false;
    }
    return true;
};

ethereum.getCurrentIdentity = async () => {
    const address = getNetworkAddress();
    return await ethereum.identityByOwner(address);
};

ethereum.toChecksumAddress = address => {
    const checksumAddress = getWeb3().utils.toChecksumAddress(address);
    return checksumAddress;
};

ethereum.sendTransaction = async ({from, to, value, gas}) => {
    const receipt = await getWeb3().eth.sendTransaction({
        from,
        to,
        value,
        gas
    });
    return receipt;
};

ethereum.getBalance = async ({address, blockIdentifier = 'latest', network}) =>
    getWeb3({chain: network}).eth.getBalance(address, blockIdentifier);

ethereum.getWallet = () => getWeb3().eth.accounts.wallet[0];

ethereum.createAccountAndAddToWallet = () => {
    const account = getWeb3().eth.accounts.create(getWeb3().utils.randomHex(32));
    const wallet = getWeb3().eth.accounts.wallet.add(account);
    return wallet;
};

/** Returns the wallet using the address in the loaded keystore */
ethereum.decryptWallet = (keystore, passcode) => {
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
    if (endBlockNumber == null) {
        endBlockNumber = await getWeb3().eth.getBlockNumber();
        log.debug({endBlockNumber}, 'Using endBlockNumber');
    }
    if (startBlockNumber == null) {
        startBlockNumber = Math.max(0, endBlockNumber - 1000000);
        log.debug({startBlockNumber}, 'Using startBlockNumber');
    }

    const provider = getWeb3({chain: network});

    log.debug(
        {account, startBlockNumber, endBlockNumber, ethBlockNumber: provider.eth.blockNumber},
        'Searching for transactions'
    );

    const txs = [];

    for (let i = startBlockNumber; i <= endBlockNumber; i++) {
        if (i % 1000 === 0) {
            log.debug('Searching block ' + i);
        }

        const block = provider.eth.getBlock(i, true);
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

ethereum.getOwner = () => getWeb3().utils.toChecksumAddress(getNetworkAddress());

ethereum.getGasPrice = async (network = 'mainnet') => {
    if (config.has(`network.web3.${network}.gas_price_wei`)) {
        return Number(config.get(`network.web3.${network}.gas_price_wei`));
    }

    const gasPrice = await getWeb3().eth.getGasPrice();
    return gasPrice;
};

ethereum.getContractFromAbi = abi => {
    const web3 = getWeb3();
    return new web3.eth.Contract(abi);
};

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
        if (params.length > 0 && config.has(`network.web3.${network}.gas_price_wei`)) {
            const decimal = Number(config.get(`network.web3.${network}.gas_price_wei`));
            params[0].gasPrice = `0x${decimal.toString(16)}`;
        }

        getWeb3({chain: network}).currentProvider.send(
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
    const provider = getEthers(network);
    const resolver = await provider.getResolver(domainName);

    if (!resolver) {
        throw new Error(`Domain ${domainName} not found in Ethereum's ${network}.`);
    }

    const [owner, content] = await Promise.all([
        provider.resolveName(domainName),
        resolver.getText(POINT_ENS_TEXT_RECORD_KEY)
    ]);

    return {owner, content};
};

/**
 * Retrieve ethereum domain (ENS) owned by `address`.
 *
 * An ENS name requries additional configuration to setup a reverse record,
 * they are not automatically set up.
 */
ethereum.getDomain = async (address, network = 'rinkeby') => {
    const provider = getEthers(network);
    const domain = await provider.lookupAddress(address);
    const msg = domain ? 'Domain found.' : 'Domain not found.';
    log.debug({address, domain}, msg);
    return domain;
};

ethereum.setDomainContent = async (domainName, data, network = 'rinkeby') => {
    if (!networks[network] || !networks[network].eth_tld_resolver) {
        throw new Error(`Missing TLD public resolver contract address for network "${network}"`);
    }

    const provider = getEthers(network);
    const tldAddress = networks[network].eth_tld_resolver;
    const ensContract = new ethers.Contract(tldAddress, ETH_RESOLVER_ABI, provider);
    const hash = namehash.hash(domainName);
    const pk = getNetworkPrivateKey();
    const wallet = new ethers.Wallet(pk, provider);
    const ensWithSigner = ensContract.connect(wallet);
    const tx = await ensWithSigner.setText(hash, POINT_ENS_TEXT_RECORD_KEY, data);
    return tx;
};

ethereum.isAddress = address => ethers.utils.isAddress(address);

module.exports = ethereum;
