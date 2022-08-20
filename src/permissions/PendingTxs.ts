import crypto from 'crypto';
import config from 'config';
import {PendingTx} from './types';
import {CacheFactory} from '../util';

const DEFAULT_NETWORK: string = config.get('network.default_network');

export class PendingTxs {
    private pendingTransactions: CacheFactory<string, PendingTx>;

    constructor(expirationSecs: number) {
        this.pendingTransactions = new CacheFactory<string, PendingTx>(expirationSecs * 1_000);
    }

    private generateId() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Adds a transaction to the pool of pending requests
     * for future processing.
     */
    public add(params: unknown[], network = DEFAULT_NETWORK) {
        const reqId = this.generateId();
        this.pendingTransactions.add(reqId, {params, network});
        return reqId;
    }

    /**
     * Retrieves a pending request by ID.
     */
    public find(reqId: string): PendingTx | null {
        return this.pendingTransactions.get(reqId);
    }

    /**
     * Deletes a transaction from the pool of pending requests and returns its ID.
     */
    public rm(reqId: string) {
        const found = this.pendingTransactions.rm(reqId);
        return found ? reqId : null;
    }
}

const EXPIRATION_SECS = config.has('rpc.send_transaction_timeout_secs')
    ? Number(config.get('rpc.send_transaction_timeout_secs'))
    : 60 * 2; // 2 minutes

const pendingTxs = new PendingTxs(EXPIRATION_SECS);

export default pendingTxs;
