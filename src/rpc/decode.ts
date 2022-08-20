const abiDecoder = require('abi-decoder');
import ethereum from '../network/providers/ethereum';
import logger from '../core/log';
import {CacheFactory} from '../util';

const log = logger.child({module: 'RPC'});

type Param = {
    name: string;
    value: string;
    type: string;
};

type DecodedTxInput = {
    name: string;
    params: Param[];
};

// Keep track of which ABIs have been added, to avoid duplicates, with a TTL.
const expiration = 10 * 60 * 1_000; // 10 minutes.
const abiTracker = new CacheFactory<string, number>(expiration);

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

    const cacheKey = `${target}:${contract}`;
    if (!abiTracker.has(cacheKey)) {
        try {
            const identity = new URL(target).host.replace(/.point$/, '');
            const {_jsonInterface} = await ethereum.loadWebsiteContract(identity, contract);
            abiDecoder.addABI(_jsonInterface);
            abiTracker.add(cacheKey, 1);
        } catch (err) {
            log.error({target, contract}, 'Error fetching contract ABI.');
            return null;
        }
    }

    const decoded = abiDecoder.decodeMethod(txInputData);
    if (!decoded) {
        log.error(
            {target, contract, txInputData},
            'Unable to decode Tx input data using abiDecoder.'
        );
        return null;
    }

    return decoded as DecodedTxInput;
}
