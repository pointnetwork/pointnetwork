import pendingTxs from '../permissions/PendingTxs';
// import permissionStore from '../permissions/PermissionStore';
import ethereum from '../network/providers/ethereum';
import config from 'config';
import solana from '../network/providers/solana';

export type RPCRequest = {
    id: number;
    method: string;
    params?: unknown[];
    origin?: string;
    network?: string
};

type HandlerFunc = (
    data: RPCRequest
) => Promise<{
    status: number;
    result: unknown;
}>;

const networks: Record<string, {type: string; address: string}> = config.get('network.web3');

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
            return {status: statusCode, result: err};
        }
    },
    eth_sendTransaction: async data => {
        const {params, network} = data;
        if (!params) {
            return {status: 400, result: {message: 'Missing `params` in request body.'}};
        }

        // Store request for future processing,
        // and send `reqId` to client so it can ask user approval.
        const reqId = pendingTxs.add(params, network);
        return {status: 200, result: {reqId, params, network}};
    },
    eth_confirmTransaction: async data => {
        const {params, id} = data;
        if (!params || !Array.isArray(params) || params.length !== 1 || !params[0].reqId) {
            return {status: 400, result: {message: 'Missing `params[0].reqId` in request body.'}};
        }

        try {
            const {reqId} = params[0] as {reqId: string};
            const tx = pendingTxs.find(reqId);
            if (!tx) {
                return {
                    status: 404,
                    result: {message: `Tx for request id "${reqId}" has not been found.`}
                };
            }

            pendingTxs.rm(reqId);
            const result = await ethereum.send('eth_sendTransaction', tx.params, id, tx.network);
            return {status: 200, result};
        } catch (err) {
            const statusCode = err.code === -32603 ? 500 : 400;
            return {status: statusCode, result: err};
        }
    },
    // Solana
    // TODO
    sendTransaction: async data => {
        const statusCode = 4200; // As per EIP-1193
        const message = 'Unsupported Method `sendTransaction`.';
        return {status: 400, result: {statusCode, message, id: data.id, network: data.network}};
    },
    simulateTransaction: async data => {
        const statusCode = 4200; // As per EIP-1193
        const message = 'Unsupported Method `simulateTransaction`.';
        return {status: 400, result: {statusCode, message, id: data.id, network: data.network}};
    },
    requestAirdrop: async data => {
        const statusCode = 4200; // As per EIP-1193
        const message = 'Unsupported Method `requestAirdrop`.';
        return {status: 400, result: {statusCode, message, id: data.id, network: data.network}};
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
        const {method, params, id} = data;

        // Check for methods related to permissions.
        const permissionHandler = permissionHandlers[method];
        if (permissionHandler) {
            const res = await permissionHandler(data);
            return res;
        }

        // Check for special/custom methods.
        const specialHandler = specialHandlers[method];
        if (specialHandler) {
            const res = await specialHandler(data);
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
        // As per EIP-1474, -32603 means internal error.
        const statusCode = err.code === -32603 ? 500 : 400;
        return {status: statusCode, result: err};
    }
};

export default handleRPC;
