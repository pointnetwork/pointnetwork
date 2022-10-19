const abiDecoder = require('abi-decoder');
import {BigNumber} from 'ethers';
import ethereum from '../network/providers/ethereum';
import solana from '../network/providers/solana';
import logger from '../core/log';
import {CacheFactory, isValidStorageId, isZeroStorageId} from '../util';
import {isFileCached} from '../client/storage';
import {getIdentity} from '../name_service/identity';

const log = logger.child({module: 'RPC'});

enum ParamMetaType {
    STORAGE_ID = 'storage_id',
    ZERO_CONTENT = 'zero_content',
    TX_HASH = 'tx_hash',
    NOT_FOUND = 'not_found',
    IDENTITIES = 'identities'
}

type Param = {
    name: string;
    value: string;
    type: string;
    meta?: {
        type: ParamMetaType;
        identities?: string[];
    };
};

export type DecodedTxInput = {
    name: string;
    params: Param[];
    gas: {
        value: string;
        currency: string;
    };
};

type ContractData = {
    abi: object;
    address: string;
};

// Keep track of which ABIs have been added, to avoid duplicates, with a TTL.
const expiration = 10 * 60 * 1_000; // 10 minutes.
const abiTracker = new CacheFactory<string, ContractData>(expiration);

/**
 * Decode Tx and return human-readable input data.
 */
export async function decodeTxInputData(
    target: string | undefined,
    contract: string | undefined,
    params: unknown[]
): Promise<DecodedTxInput | null> {
    const txInputData =
        params && params.length > 0 && (params[0] as Record<string, string>).hasOwnProperty('data')
            ? (params[0] as Record<string, string>).data
            : null;

    if (!target || !contract || !txInputData) {
        log.error(
            {target, contract, txInputDataLen: txInputData ? txInputData.length : 0},
            'Missing information to decode tx input data'
        );
        return null;
    }

    let contractInstance;
    const cacheKey = `${target}:${contract}`;
    if (!abiTracker.has(cacheKey)) {
        try {
            const identity = new URL(target).host.replace(/.point$/, '');
            contractInstance = await ethereum.loadWebsiteContract(identity, contract);
            abiDecoder.addABI(contractInstance._jsonInterface);
            abiTracker.add(cacheKey, {
                abi: contractInstance._jsonInterface,
                address: contractInstance.options.address
            });
        } catch (err) {
            log.error({target, contract}, 'Error fetching contract ABI.');
            return null;
        }
    } else {
        const {abi, address} = abiTracker.get(cacheKey)!;
        contractInstance = ethereum.getContractFromAbi(abi, address);
    }

    const decoded: Omit<DecodedTxInput, 'gas'> | undefined = abiDecoder.decodeMethod(txInputData);

    if (!decoded) {
        log.error(
            {target, contract, txInputData},
            'Unable to decode Tx input data using abiDecoder.'
        );
        return null;
    }

    const gas = {value: '', currency: ''};
    try {
        const method = contractInstance.methods && contractInstance.methods[decoded.name];
        if (!method || typeof method !== 'function') {
            throw new Error(`Method ${decoded.name} not found in contract ABI.`);
        }

        const args = decoded.params.map(p => p.value);
        const from = ethereum.getOwner();
        const gasAmount = await method(...args).estimateGas({from});
        const gasPrice = await ethereum.getGasPrice();
        gas.value = BigNumber.from(gasAmount)
            .mul(gasPrice)
            .toString();
        gas.currency = 'POINT';
    } catch (err) {
        log.warn(err, `Unable to estimate gas for target: ${target}, contract: ${contract}.`);
    }

    return {...decoded, gas};
}

/**
 * Checks if an address owns a handle (has registered an identity).
 * If it does, it returns the handle,
 * if it doesn't, it returns the address.
 */
async function getIdentityByAddress(address: string): Promise<string> {
    let key = '';
    let targets: string[] = [];
    if (solana.isAddress(address)) {
        key = 'solAddress';
        targets = ['solana'];
    } else if (ethereum.isAddress(address)) {
        key = 'ethAddress';
        targets = ['point'];
    }

    if (!key || targets.length === 0) {
        return address;
    }

    try {
        const {identity} = await getIdentity({[key]: address, targets});
        return identity || address;
    } catch {
        return address;
    }
}

async function addMetadaToParam(param: Param, network: string) {
    if (!param.value) {
        return;
    }

    // Check if param is an address, and if so check if it owns a handle.
    if (param.type === 'address') {
        const identity = await getIdentityByAddress(param.value);
        if (identity) {
            param.meta = {type: ParamMetaType.IDENTITIES, identities: [identity]};
        }
    } else if (param.type === 'address[]' && Array.isArray(param.value)) {
        const identities = await Promise.all(param.value.map(addr => getIdentityByAddress(addr)));
        param.meta = {type: ParamMetaType.IDENTITIES, identities};
    }

    if (typeof param.value !== 'string') {
        return;
    }

    if (isZeroStorageId(param.value)) {
        param.meta = {type: ParamMetaType.ZERO_CONTENT};
        return;
    }

    // Check if param is a storage ID or a transaction hash.
    if (isValidStorageId(param.value)) {
        // `isValidStorageId` does not necessarily mean it's actually a storage ID,
        // it means it looks like one. So, to tell for sure if it's actually a storage ID,
        // we look for the potential file in the local cache.
        if (await isFileCached(param.value)) {
            param.meta = {type: ParamMetaType.STORAGE_ID};
        } else {
            // Check if it's a blockchain tx hash
            try {
                const receipt = await ethereum.getTransactionReceipt(param.value, network);
                if (receipt.blockNumber) {
                    param.meta = {type: ParamMetaType.TX_HASH};
                } else {
                    throw new Error(`${param.value} is not a blockchain transaction hash`);
                }
            } catch {
                param.meta = {type: ParamMetaType.NOT_FOUND};
            }
        }
    }
}

/**
 * Adds metadata about the transaction inputs.
 */
export async function addMetadata(txData: DecodedTxInput, network: string) {
    if (!txData.params || txData.params.length === 0) {
        return;
    }
    await Promise.all(txData.params.map(param => addMetadaToParam(param, network)));
}
