import pendingTxs from '../permissions/PendingTxs';
import config from 'config';
import {blockchain, isChainId} from '../network/providers';
import logger from '../core/log';
const log = logger.child({module: 'RPC'});

export type RPCRequest = {
    id?: number;
    method: string;
    params?: unknown[];
    origin?: string;
    network?: string;
};

type HandlerFunc = (
    data: RPCRequest
) => Promise<{
    status: number;
    result: unknown;
}>;

const networks: Record<string, {[k: string]: string | number | boolean}> = config.get(
    'network.web3'
);

const storeTransaction: HandlerFunc = async data => {
    const {params} = data;
    const network = data.network ?? 'ynet';
    if (!params) {
        return {status: 400, result: {message: 'Missing `params` in request body.'}};
    }
    if (networks[network].type === 'solana' && params.length !== 1) {
        const message = 'Wrong number or params for solana transaction, expected 1';
        return {
            status: 400,
            result: {message}
        };
    }

    // Store request for future processing,
    // and send `reqId` to client so it can ask user approval.
    const reqId = pendingTxs.add(params, network);
    return {status: 200, result: {reqId, params, network}};
};

const confirmTransaction: HandlerFunc = async data => {
    const id = data.id ?? new Date().getTime();
    const {params} = data;
    if (!params || !Array.isArray(params) || params.length !== 1 || !params[0].reqId) {
        return {status: 400, result: {message: 'Missing `params[0].reqId` in request body.'}};
    }

    const {reqId} = params[0] as {reqId: string};
    const tx = pendingTxs.find(reqId);
    if (!tx) {
        return {
            status: 404,
            result: {message: `Tx for request id "${reqId}" has not been found.`}
        };
    }
    const network = tx.network ?? 'ynet';

    const chainId = networks[network].chain_id;
    if (!isChainId(chainId)) {
        return {status: 400, result: {code: 400, message: 'Missing or invalid chain_id'}};
    }

    try {
        pendingTxs.rm(reqId);
        const result = await blockchain.sendTransaction(chainId, id, tx.params);
        return {status: 200, result};
    } catch (err) {
        log.error({message: err.message, stack: err.stack, tx}, 'Failed to confirm transaction');
        const statusCode = err.code === -32603 ? 500 : 400;
        return {status: statusCode, result: {message: err.message, code: statusCode}};
    }
};

const requestAccounts: HandlerFunc = async data => {
    const id = data.id ?? new Date().getTime();
    const chainId = networks[data.network || 'ynet'].chain_id;
    if (!isChainId(chainId)) {
        return {status: 400, result: {code: 400, message: 'Missing or invalid chain_id'}};
    }

    try {
        const result = await blockchain.requestAccounts(chainId, id);
        return {status: 200, result, newOne: true};
    } catch (err) {
        const statusCode = err.code === -32603 ? 500 : 400;
        return {status: statusCode, result: {code: statusCode, message: err.message}};
    }
};

// Handlers for non-standard methods, or methods with custom logic.
const specialHandlers: Record<string, HandlerFunc> = {
    // Ethereum
    eth_requestAccounts: requestAccounts,
    eth_sendTransaction: storeTransaction,
    eth_confirmTransaction: confirmTransaction,
    // Solana
    solana_requestAccount: requestAccounts,
    solana_sendTransaction: storeTransaction,
    solana_confirmTransaction: confirmTransaction
};

/**
 * Send RPC method calls to the blockchain client.
 */
const handleRPC: HandlerFunc = async data => {
    try {
        const network = data.network ?? 'ynet';
        const id = data.id ?? new Date().getTime();
        const {method, params, origin} = data;

        // Check for special/custom methods.
        const specialHandler = specialHandlers[method];
        if (specialHandler) {
            const res = await specialHandler({id, method, params, origin, network});
            return res;
        }

        // `method` is a standard RPC method (EIP-1474).
        if (!networks[network]) {
            return {status: 400, result: {message: `Unknown network ${network}`, id, network}};
        }

        // Check if we have a valid chain ID.
        const chainId = networks[network].chain_id;
        if (!isChainId(chainId)) {
            throw new Error(`Missing or invalid chain_id in config for network ${network}`);
        }

        const result = await blockchain.send(chainId, {method, params, id, network});
        return {status: 200, result};
    } catch (err) {
        log.error({message: err.message, stack: err.stack}, 'Error handling RPC');
        // As per EIP-1474, -32603 means internal error.
        const statusCode = err.code === -32603 ? 500 : 400;
        return {status: statusCode, result: {code: err.code, message: err.message}};
    }
};

export default handleRPC;
