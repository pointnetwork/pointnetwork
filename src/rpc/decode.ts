const abiDecoder = require('abi-decoder');
import {BigNumber} from 'ethers';
import ethereum from '../network/providers/ethereum';
import logger from '../core/log';
import {CacheFactory} from '../util';

const log = logger.child({module: 'RPC'});

type Param = {
    name: string;
    value: string;
    type: string;
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
