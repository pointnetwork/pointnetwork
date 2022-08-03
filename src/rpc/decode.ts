const abiDecoder = require('abi-decoder');
import ethereum from '../network/providers/ethereum';

type Param = {
    name: string;
    value: string;
    type: string;
};

type DecodedTxInput = {
    name: string;
    params: Param[];
};

// A map to keep track of which ABIs have been added, to avoid duplicates.
const addedABIs: Record<string, boolean> = {};

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
        return null;
    }

    // TODO: keep a cache to avoid fethcing same ABI multiple times.
    const identity = new URL(target).host.replace(/.point$/, '');
    const {_jsonInterface} = await ethereum.loadWebsiteContract(identity, contract);

    if (!addedABIs[`${target}:${contract}`]) {
        abiDecoder.addABI(_jsonInterface);
        addedABIs[`${target}:${contract}`] = true;
    }

    const decoded = abiDecoder.decodeMethod(txInputData);
    return decoded ? (decoded as DecodedTxInput) : null;
}
