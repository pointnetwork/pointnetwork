import pendingTxs from '../permissions/PendingTxs';
// import permissionStore from '../permissions/PermissionStore';
import ethereum from '../network/providers/ethereum';
import config from 'config';
import solana, {TransactionJSON} from '../network/providers/solana';
import logger from '../core/log';
const log = logger.child({module: 'RPC'});

export type RPCRequest = {
    id: number;
    method: string;
    params?: unknown[];
    origin?: string;
    network: string
};

type HandlerFunc = (
    data: RPCRequest
) => Promise<{
    status: number;
    result: unknown;
}>;

const networks: Record<string, {type: string; address: string}> = config.get('network.web3');

const storeTransaction: HandlerFunc = async data => {
    const {params, network} = data;
    if (!params) {
        return {status: 400, result: {message: 'Missing `params` in request body.'}};
    }
    if (networks[network].type === 'solana' && params.length !== 1) {
        return {
            status: 400, result: {
                message: 
                    'Wrong number or params for solana transaction, expected 1'
            }
        };
    }

    // Store request for future processing,
    // and send `reqId` to client so it can ask user approval.
    const reqId = pendingTxs.add(params, network);
    return {status: 200, result: {reqId, params, network}};
};

const confirmTransaction: HandlerFunc = async data => {
    const {params, id} = data;
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

    try {
        pendingTxs.rm(reqId);
        let result;

        switch (networks[network].type) {
            case 'eth':
                result = await ethereum.send('eth_sendTransaction', tx.params, id, network);
                break;
            case 'solana':
                result = await solana.signAndSendTransaction(
                    id,
                    tx.params[0] as TransactionJSON,
                    network
                );
                break;
            default:
                return {
                    status: 400, result: {
                        message: `Unsupported type ${networks[network].type} for network ${network}`,
                        id,
                        network
                    }
                };
        }

        return {status: 200, result};
    } catch (err) {
        log.error({message: err.message, stack: err.stack, tx}, 'Failed to confirm transaction');
        const statusCode = err.code === -32603 ? 500 : 400;
        return {status: statusCode, result: {message: err.message, code: statusCode}};
    }
};

// Handlers for non-standard methods, or methods with custom logic.
const specialHandlers: Record<string, HandlerFunc> = {
    // Ethereum
    eth_requestAccounts: async data => {
        const {params, id, network} = data;
        try {
            const result = await ethereum.send('eth_accounts', params, id, network);
            return {status: 200, result};
        } catch (err) {
            const statusCode = err.code === -32603 ? 500 : 400;
            return {status: statusCode, result: {code: statusCode, message: err.message}};
        }
    },
    eth_sendTransaction: storeTransaction,
    eth_confirmTransaction: confirmTransaction,
    // Solana
    solana_sendTransaction: storeTransaction,
    solana_confirmTransaction: confirmTransaction,
    solana_requestAccount: async ({id}) => {
        try {
            const result = await solana.requestAccount(id, 'solana_devnet');
            return {status: 200, result};
        } catch (err) {
            const statusCode = err.code === -32603 ? 500 : 400;
            return {status: statusCode, result: {code: statusCode, message: err.message}};
        }
    }
};

// Handlers for methods related to permissions.
const permissionHandlers: Record<string, HandlerFunc> = {
    wallet_requestPermissions: async data => {
        const statusCode = 4200; // As per EIP-1193
        const message = 'Unsupported Method `wallet_requestPermissions`.';
        return {status: 400, result: {statusCode, message, id: data.id, network: data.network}};
        /*
        try {
            const {params, origin} = data;
            if (!origin) {
                return {status: 400, result: {message: '`Origin` header is required.'}};
            }

            const address = ethereum.getOwner();

            // If params is not provided or it's an empty array, revoke all permissions.
            if (!params || !Array.isArray(params) || params.length === 0) {
                const id = await permissionStore.revoke(origin, address);
                return {
                    status: 200,
                    result: {permissionsId: id, message: 'Revoked all permissions.'}
                };
            }

            const allowedMethods = params ? Object.keys(params[0] as Record<string, object>) : [];
            const id = await permissionStore.upsert(origin, address, allowedMethods);
            return {
                status: 200,
                result: {
                    permissionsId: id,
                    message: `Permission granted for ${allowedMethods.join(', ')}`
                }
            };
        } catch (err) {
            return {status: 400, result: err};
        }
        */
    },
    wallet_getPermissions: async data => {
        const statusCode = 4200; // As per EIP-1193
        const message = 'Unsupported Method `wallet_getPermissions`.';
        return {status: 400, result: {statusCode, message, id: data.id, network: data.network}};
        /*
        const {origin} = data;
        if (!origin) {
            return {status: 400, result: {message: '`Origin` header is required.'}};
        }

        const address = ethereum.getOwner();
        const permissions = await permissionStore.get(origin, address);
        return {status: 200, result: permissions || null};
        */
    }
};

/**
 * Send RPC method calls to the blockchain client.
 */
const handleRPC: HandlerFunc = async data => {
    try {
        const network = data.network ?? 'ynet';
        const id = data.id ?? new Date().getTime();
        const {method, params, origin} = data;

        // Check for methods related to permissions.
        const permissionHandler = permissionHandlers[method];
        if (permissionHandler) {
            const res = await permissionHandler({id, method, params, origin, network});
            return res;
        }

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
        let result;
        switch (networks[network].type) {
            case 'eth':
                result = await ethereum.send(method, params, id, network);
                break;
            case 'solana':
                result = await solana.send({method, params, id, network});
                break;
            default:
                return {
                    status: 400, result: {
                        message: `Unsupported type ${networks[network].type} for network ${network}`,
                        id,
                        network
                    }
                };
        }

        return {status: 200, result};
    } catch (err) {
        log.error({message: err.message, stack: err.stack}, 'Error handling RPC');
        // As per EIP-1474, -32603 means internal error.
        const statusCode = err.code === -32603 ? 500 : 400;
        return {status: statusCode, result: {code: err.code, message: err.message}};
    }
};

export default handleRPC;
