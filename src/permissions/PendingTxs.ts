import crypto from 'crypto';
import config from 'config';
import {PendingTx} from './types';

const DEFAULT_NETWORK: string = config.get('network.default_network');

export class PendingTxs {
    private expirationSecs: number;
    private pendingTransactions: Record<string, PendingTx> = {};

    constructor(expirationSecs: number) {
        this.expirationSecs = expirationSecs;
    }

    private calculateExpiration() {
        const now = new Date();
        return new Date(now.setSeconds(now.getSeconds() + this.expirationSecs));
    }

    private generateId() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Deletes old transactions from the pending requests pool.
     * It's run every time `find()` is invoked to only return valid transactions.
     * But the method is exposed so that it can be called at will.
     */
    gc() {
        const now = new Date();
        Object.keys(this.pendingTransactions).forEach(id => {
            if (now >= this.pendingTransactions[id].expiresAt) {
                delete this.pendingTransactions[id];
            }
        });
    }

    /**
     * Adds a transaction to the pool of pending requests
     * for future processing.
     */
    add(params: unknown[], network = DEFAULT_NETWORK) {
        const reqId = this.generateId();
        const expiresAt = this.calculateExpiration();
        this.pendingTransactions[reqId] = {params, expiresAt, network};
        return reqId;
    }

    /**
     * Retrieves a pending request by ID.
     * It runs `gc` first, so it wil only return a request
     * if it is not expired.
     */
    find(reqId: string): PendingTx | undefined {
        // Remove old requests first.
        this.gc();
        return this.pendingTransactions[reqId];
    }

    /**
     * Deletes a transaction from the pool of pending requests.
     */
    rm(reqId: string) {
        if (!this.pendingTransactions[reqId]) {
            return null;
        }
        delete this.pendingTransactions[reqId];
        return reqId;
    }
}

const EXPIRATION_SECS = config.has('rpc.send_transaction_timeout_secs')
    ? Number(config.get('rpc.send_transaction_timeout_secs'))
    : 60 * 2; // 2 minutes

const pendingTxs = new PendingTxs(EXPIRATION_SECS);

export default pendingTxs;
