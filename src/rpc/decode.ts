const abiDecoder = require('abi-decoder');
import ethereum from '../network/providers/ethereum';
import logger from '../core/log';

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

/**
 * Keep track of which ABIs have been added, to avoid duplicates, with a TTL.
 */
export class ABITracker {
    private addedABIs: Record<string, number> = {};
    private ttlMs: number;

    constructor(ttlMs?: number) {
        this.ttlMs = ttlMs ?? 10 * 60 * 1000; // default: 10 minutes.
    }

    private key(target: string, contract: string): string {
        return `${target}:${contract}`;
    }

    private isExpired(key: string): boolean {
        if (!this.addedABIs[key]) {
            return false;
        }
        const ttl = this.addedABIs[key];
        return Date.now() - ttl > this.ttlMs;
    }

    public has(target: string, contract: string): boolean {
        const key = this.key(target, contract);
        if (this.isExpired(key)) {
            delete this.addedABIs[key];
        }
        return Boolean(this.addedABIs[key]);
    }

    public add(target: string, contract: string): void {
        const key = this.key(target, contract);
        this.addedABIs[key] = Date.now();
    }

    public len(): number {
        return Object.getOwnPropertyNames(this.addedABIs).length;
    }
}

const abiTracker = new ABITracker();

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

    if (!abiTracker.has(target, contract)) {
        try {
            const identity = new URL(target).host.replace(/.point$/, '');
            const {_jsonInterface} = await ethereum.loadWebsiteContract(identity, contract);
            abiDecoder.addABI(_jsonInterface);
            abiTracker.add(target, contract);
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
