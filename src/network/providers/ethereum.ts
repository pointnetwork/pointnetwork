import * as path from 'path';
import {
    BigNumber,
    BytesLike,
    Contract,
    ContractFactory,
    ContractInterface,
    ContractReceipt,
    ethers,
    Wallet
} from 'ethers';
import {promises as fs} from 'fs';
import * as _ from 'lodash';
import * as config from 'config';
import {
    JsonRpcProvider,
    Listener,
    TransactionResponse,
    WebSocketProvider
} from '@ethersproject/providers';
import {
    Address,
    ChainName,
    ContractMethodName,
    ContractName,
    ContractVersion,
    Domain,
    EventName,
    Identity,
    NetworkConfigs,
    NetworkName,
    ProvidersList,
    RecoveryObject,
    Target,
    Version
} from '../types';

const {getFile, getJSON} = require('../../client/storage');
const ZDNS_ROUTES_KEY = 'zdns/routes';
const retryableErrors = {ESOCKETTIMEDOUT: 1};
const logger = require('../../core/log');
const log = logger.child({module: 'EthereumProvider'});

const {getNetworkPrivateKey, getNetworkAddress} = require('../../wallet/keystore');
const {statAsync, resolveHome, compileAndSaveContract, escapeString} = require('../../util');
const {createCache} = require('../../util/cache');

function isRetryableError({message}: {message: string}) {
    for (const code in retryableErrors) {
        if (RegExp(code).test(message)) {
            return true;
        }
    }
    return false;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function getContractInstance(address: string, abi: ContractInterface) {
    const {provider, wallet} = getWeb3();
    const contract = new ethers.Contract(address, abi, provider).connect(wallet);
    return contract;
}

interface Web3InstanceConfig {
    blockchainUrl: string;
    privateKey: BytesLike;
}

interface Web3Instance {
    wallet: Wallet;
    provider: JsonRpcProvider | WebSocketProvider;
}

function createWeb3Instance({blockchainUrl, privateKey}: Web3InstanceConfig): Web3Instance {
    const provider = blockchainUrl.startsWith('ws://')
        ? new ethers.providers.WebSocketProvider(blockchainUrl)
        : new ethers.providers.JsonRpcProvider(blockchainUrl);

    const wallet = new ethers.Wallet(privateKey, provider);

    log.debug({blockchainUrl}, 'Created ethers instance');

    return {wallet, provider};
}

const abisByContractName: Record<string, ContractInterface> = {};

const web3CallRetryLimit: number = config.get('network.web3_call_retry_limit');

const networks: NetworkConfigs = config.get('network.web3');

const providers: ProvidersList = {
    ynet: createWeb3Instance({
        blockchainUrl: networks.ynet.address,
        privateKey: '0x' + getNetworkPrivateKey()
    })
};

function getWeb3(chain = 'ynet'): Web3Instance {
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
}

// Client that consolidates all blockchain-related functionality
export async function loadPointContract(
    contractName: string,
    at: string,
    basepath = path.resolve(__dirname, '..', '..')
) {
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
}

export async function loadIdentityContract() {
    const at: Address = config.get('network.identity_contract_address');
    log.debug({address: at}, 'Identity contract address');
    return await loadPointContract('Identity', at);
}

export async function loadWebsiteContract(
    target: Target,
    contractName: ContractName,
    version: ContractVersion = 'latest'
): Promise<Contract> {
    // todo: make it nicer, extend to all potential contracts, and add to docs
    // @ means internal contract for Point Network (truffle/contracts)
    if ((target === '@' || target === 'point') && contractName === 'Identity') {
        return loadIdentityContract();
    }

    const at = await getKeyValue(
        target,
        'zweb/contracts/address/' + contractName,
        version,
        'equalOrBefore'
    );

    const abi_storage_id = await getKeyValue(
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
}

type Params = any[];

type Options = {
    gasLimit?: BigNumber;
    amountInWei?: BigNumber;
};

export async function web3send(
    contract: Contract,
    method: ContractMethodName,
    params: Params,
    options: Options = {}
): Promise<ContractReceipt> {
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
                    timePassedSinceRequestStart: Date.now() - (requestStart || 0)
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
}

export async function callContract(
    target: Target,
    contractName: ContractName,
    method: ContractMethodName,
    params: Params,
    version: ContractVersion = 'latest'
) {
    // todo: multiple arguments, but check existing usage // huh?
    let attempt = 0;
    log.debug({target, contractName, method, params}, 'Contract Call');
    while (true) {
        try {
            const contract = await loadWebsiteContract(target, contractName, version);
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
}

type EventOptions = {
    fromBlock?: number;
    toBlock?: number | string;
    filter?: Record<string, string | number>;
};

export async function getPastEvents(
    target: Target,
    contractName: ContractName,
    event: EventName,
    options: EventOptions = {fromBlock: 0, toBlock: 'latest', filter: {}}
) {
    const {fromBlock, toBlock, filter} = options;
    const contract = await loadWebsiteContract(target, contractName);
    const bloomFilter = contract.filters[event]();

    let events = await contract.queryFilter(bloomFilter, fromBlock, toBlock);

    if (!filter) {
        return events;
    }

    //filter non-indexed properties from return value for convenience
    if (Object.keys(filter).length > 0) {
        for (const k in filter) {
            events = events.filter(event => event?.args?.[k] === filter[k]);
        }
    }

    return events;
}

export async function getBlockNumber() {
    const {provider} = getWeb3();
    const n = await provider.getBlockNumber();
    return n;
}

export async function getBlockTimestamp(blockNumber: number) {
    const {provider} = getWeb3();
    const block = await provider.getBlock(blockNumber);
    return block.timestamp;
}

export async function subscribeContractEvent(
    target: Target,
    contractName: ContractName,
    event: EventName,
    listener: Listener,
    onStart: (args: any) => void
    // options = {}
) {
    const contract = await loadWebsiteContract(target, contractName);
    contract.on(event, listener);

    const message = `Subscribed to "${contractName}" contract "${event}" events`;
    onStart({data: {message}});
}

export async function removeSubscriptionById(
    target: Target,
    contractName: ContractName,
    event: EventName,
    listener: Listener,
    onRemove: (args: any) => void
) {
    const contract = await loadWebsiteContract(target, contractName);
    contract.off(event, listener);
    const message = `Unsubscribed from "${contractName}" contract "${event}" events`;
    return onRemove({data: {message}});
}

export async function sendToContract(
    target: Target,
    contractName: ContractName,
    methodName: ContractMethodName,
    params: Params,
    options: Options = {},
    version: Version = 'latest'
): Promise<ContractReceipt> {
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
    const contract = await loadWebsiteContract(target, contractName);

    if (!Array.isArray(params)) {
        throw Error('Params sent to callContract is not an array');
    }

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
    return web3send(contract, methodName, params, options);
}

export async function identityByOwner(owner: Address) {
    try {
        const identityContract = await loadIdentityContract();
        return await identityContract.getIdentityByOwner(owner);
    } catch (e) {
        log.error({owner}, 'Error: identityByOwner');
        throw e;
    }
}

export async function ownerByIdentity(identity: Identity) {
    try {
        const identityContract = await loadIdentityContract();
        return await identityContract.getOwnerByIdentity(identity);
    } catch (e) {
        log.error({identity}, 'Error: ownerByIdentity');
        throw e;
    }
}

export async function commPublicKeyByIdentity(identity: Identity) {
    try {
        const identityContract = await loadIdentityContract();
        const parts = await identityContract.getCommPublicKeyByIdentity(identity);
        return '0x' + parts.part1.replace('0x', '') + parts.part2.replace('0x', '');
        // todo: make damn sure it didn't return something silly like 0x0 or 0x by mistake
    } catch (e) {
        log.error('Error: commPublicKeyByIdentity', {identity});
    }
}

export async function isIdentityDeployer(identity: Identity, address: Address) {
    try {
        const identityContract = await loadIdentityContract();
        return await identityContract.isIdentityDeployer(identity, address);
    } catch (e) {
        log.error({address}, 'Error: isIdentityDeployer');
        throw e;
    }
}

const zRecordCache = createCache();

export async function getZRecord(domain: Domain, version = 'latest') {
    domain = domain.replace('.point', ''); // todo: rtrim instead
    return zRecordCache.get(`${domain}-${ZDNS_ROUTES_KEY}-${version}`, async () => {
        const result = await getKeyValue(domain, ZDNS_ROUTES_KEY, version);
        return result?.substr(0, 2) === '0x' ? result.substr(2) : result;
    });
}

export async function putZRecord(domain: Domain, routesFile: string, version: Version) {
    domain = domain.replace('.point', ''); // todo: rtrim instead
    return await putKeyValue(domain, ZDNS_ROUTES_KEY, routesFile, version);
}

export async function getKeyLastVersion(identity: Identity, key: string) {
    const filter = {identity: identity, key: key};

    const events = await getPastEvents('@', 'Identity', 'IKVSet', {
        filter,
        fromBlock: 0,
        toBlock: 'latest'
    });

    if (events.length > 0) {
        const maxObj = events.reduce((prev, current) =>
            prev.blockNumber > current.blockNumber ? prev : current
        );
        return maxObj?.args?.version || null;
    } else {
        return null;
    }
}

export function compareVersions(v1: Version, v2: Version) {
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
}

export async function getLastVersionOrBefore(version: Version, events: ethers.Event[]) {
    const filteredEvents = events.filter(event =>
        [-1, 0].includes(compareVersions(event?.args?.version, version))
    );
    if (filteredEvents.length > 0) {
        const maxObj = filteredEvents.reduce((prev, current) =>
            compareVersions(prev?.args?.version, current?.args?.version) === 1 ? prev : current
        );
        return maxObj?.args?.value;
    } else {
        return null;
    }
}

const keyValueCache = createCache();

export async function getKeyValue(
    identity: Identity,
    key: string,
    version = 'latest',
    versionSearchStrategy = 'exact'
) {
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
                const contract = await loadIdentityContract();
                return contract.ikvGet(identity, key);
            });
        } else {
            const cacheKey = `${baseKey}-${version}`;
            if (versionSearchStrategy === 'exact') {
                return keyValueCache.get(cacheKey, async () => {
                    const filter = {identity: identity, key: key, version: version};
                    const events = await getPastEvents('@', 'Identity', 'IKVSet', {
                        filter,
                        fromBlock: 0,
                        toBlock: 'latest'
                    });
                    return events.length > 0 ? events[0]?.args?.value : null;
                });
            } else if (versionSearchStrategy === 'equalOrBefore') {
                return keyValueCache.get(cacheKey, async () => {
                    const filter = {identity: identity, key: key};
                    const events = await getPastEvents('@', 'Identity', 'IKVSet', {
                        filter,
                        fromBlock: 0,
                        toBlock: 'latest'
                    });
                    return getLastVersionOrBefore(version, events);
                });
            } else {
                return null;
            }
        }
    } catch (e) {
        log.error({error: e, stack: e.stack, identity, key, version}, 'getKeyValue error');
        throw e;
    }
}

export async function putKeyValue(
    identity: Identity,
    key: string,
    value: string,
    version: Version
) {
    try {
        // todo: only send transaction if it's different. if it's already the same value, no need
        identity = identity.replace('.point', ''); // todo: rtrim instead
        const contract = await loadIdentityContract();
        log.debug({identity, key, value, version}, 'Ready to put key value');
        await web3send(contract, 'ikvPut', [identity, key, value, version]);
        keyValueCache.delStartWith(`${identity}-${key}`);
    } catch (e) {
        log.error({error: e, stack: e.stack, identity, key, value, version}, 'putKeyValue error');
        throw e;
    }
}

export async function registerVerified(
    identity: Identity,
    address: Address,
    commPublicKey: Buffer,
    hashedMessage: string,
    {v, r, s}: RecoveryObject
) {
    try {
        if (!Buffer.isBuffer(commPublicKey))
            throw Error('registerIdentity: commPublicKey must be a buffer');
        if (Buffer.byteLength(commPublicKey) !== 64)
            throw Error('registerIdentity: commPublicKey must be 64 bytes');
        // todo: validate identity and address

        identity = identity.replace('.point', ''); // todo: rtrim instead
        const contract = await loadIdentityContract();
        log.debug({address: contract.options.address}, 'Loaded "identity contract" successfully');

        log.debug({identity, address}, 'Registering identity');
        const result = await web3send(contract, 'registerVerified', [
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
}

export async function registerIdentity(
    identity: Identity,
    address: Address,
    commPublicKey: Buffer
) {
    try {
        if (!Buffer.isBuffer(commPublicKey))
            throw Error('registerIdentity: commPublicKey must be a buffer');
        if (Buffer.byteLength(commPublicKey) !== 64)
            throw Error('registerIdentity: commPublicKey must be 64 bytes');
        // todo: validate identity and address

        identity = identity.replace('.point', ''); // todo: rtrim instead
        const contract = await loadIdentityContract();
        log.debug({address: contract.address}, 'Loaded "identity contract" successfully');

        log.debug({identity, address}, 'Registering identity');
        const result = await web3send(contract, 'register', [
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
}

export async function isCurrentIdentityRegistered() {
    const address = getNetworkAddress();
    const identity = await identityByOwner(address);
    return (
        identity &&
        identity.replace('0x', '').toLowerCase() !== address.replace('0x', '').toLowerCase()
    );
}

export async function getCurrentIdentity() {
    const address = getNetworkAddress();
    return await identityByOwner(address);
}

export async function toChecksumAddress(address: Address) {
    return ethers.utils.getAddress(address);
}

type GetBalanceInput = {
    address: Address;
    blockIdentifier?: number | string;
    network: NetworkName;
};

export async function getBalance({address, blockIdentifier = 'latest', network}: GetBalanceInput) {
    return getWeb3(network).provider.getBalance(address, blockIdentifier);
}

export async function getWallet() {
    return getWeb3().wallet;
}

type getTransactionsByAccountInput = {
    account: Address;
    startBlockNumber?: number | null;
    endBlockNumber?: number | null;
    network: NetworkName;
};

export async function getTransactionsByAccount({
    account,
    startBlockNumber = null,
    endBlockNumber = null,
    network
}: getTransactionsByAccountInput) {
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

    const txs: TransactionResponse[] = [];

    for (let i = startBlockNumber; i <= endBlockNumber; i++) {
        if (i % 1000 === 0) {
            log.debug('Searching block ' + i);
        }

        const block = await provider.getBlockWithTransactions(i);
        if (!block?.transactions?.length) {
            continue;
        }

        block.transactions.forEach(transaction => {
            if (account === '*' || account === transaction.from || account === transaction.to) {
                txs.push(transaction);
            }
        });

        log.debug({txs}, 'Account transactions');
    }

    return txs;
}

export function getOwner() {
    return ethers.utils.getAddress(getNetworkAddress());
}

export async function getGasPrice() {
    const gasPrice = await getWeb3().provider.getGasPrice();
    return gasPrice;
}

export async function deployContract(contractFactory: ContractFactory, contractName: ContractName) {
    const gasPrice = await getGasPrice();
    const contract = await contractFactory.deploy({
        from: getOwner(),
        gasPrice
    });
    await contract.deployed();
    const address = contract.address;
    log.debug({contractName, address}, 'Deployed Contract Instance');
    return address;
}

export function toHex(n: number) {
    return ethers.utils.hexlify(n);
}

export async function resolveDomain(domainName: string, network = 'rinkeby') {
    const {provider} = getWeb3(network);
    const resolver = await provider.getResolver(domainName);

    const [owner, content] = await Promise.all([
        provider.resolveName(domainName),
        resolver ? resolver.getText('point') : null
    ]);

    return {owner, content};
}

type SendInput = {
    method: ContractMethodName;
    params?: Array<any>;
    network: ChainName;
};

export async function send({method, params = [], network}: SendInput) {
    const {provider} = getWeb3(network);
    const response = await provider.send(method, params);
    return response;
}
