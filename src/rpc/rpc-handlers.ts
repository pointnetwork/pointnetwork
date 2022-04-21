import pendingTxs from '../permissions/PendingTxs';
// import permissionStore from '../permissions/PermissionStore';
import blockchain from '../network/blockchain';

export type RPCRequest = {
    id: number;
    method: string;
    params?: unknown[];
    origin?: string;
};

type HandlerFunc = (
    data: RPCRequest
) => Promise<{
    status: number;
    result: unknown;
}>;

// Handlers for non-standard methods, or methods with custom logic.
const specialHandlers: Record<string, HandlerFunc> = {
    eth_requestAccounts: async data => {
        const {params, id} = data;
        try {
            const result = await blockchain.send('eth_accounts', params, id);
            return {status: 200, result};
        } catch (err) {
            const statusCode = err.code === -32603 ? 500 : 400;
            return {status: statusCode, result: err};
        }
    },
    eth_sendTransaction: async data => {
        const {params} = data;
        if (!params) {
            return {status: 400, result: {message: 'Missing `params` in request body.'}};
        }

        // Store request for future processing,
        // and send `reqId` to client so it can ask user approval.
        const reqId = pendingTxs.add(params);
        return {status: 200, result: {reqId, params}};
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
            const result = await blockchain.send('eth_sendTransaction', tx.params, id);
            return {status: 200, result};
        } catch (err) {
            const statusCode = err.code === -32603 ? 500 : 400;
            return {status: statusCode, result: err};
        }
    }
};

// Handlers for methods related to permissions.
const permissionHandlers: Record<string, HandlerFunc> = {
    wallet_requestPermissions: async data => {
        const statusCode = 4200; // As per EIP-1193
        const message = 'Unsupported Method `wallet_requestPermissions`.';
        return {status: 400, result: {statusCode, message, id: data.id}};
        /*
        try {
            const {params, origin} = data;
            if (!origin) {
                return {status: 400, result: {message: '`Origin` header is required.'}};
            }

            const address = blockchain.getOwner();

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
        return {status: 400, result: {statusCode, message, id: data.id}};
        /*
        const {origin} = data;
        if (!origin) {
            return {status: 400, result: {message: '`Origin` header is required.'}};
        }

        const address = blockchain.getOwner();
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
        // Check for methods related to permissions.
        const permissionHandler = permissionHandlers[data.method];
        if (permissionHandler) {
            const res = await permissionHandler(data);
            return res;
        }

        // Check for special/custom methods.
        const specialHandler = specialHandlers[data.method];
        if (specialHandler) {
            const res = await specialHandler(data);
            return res;
        }

        // `method` is a standard RPC method (EIP-1474).
        const result = await blockchain.send(data.method, data.params, data.id);
        return {status: 200, result};
    } catch (err) {
        // As per EIP-1474, -32603 means internal error.
        const statusCode = err.code === -32603 ? 500 : 400;
        return {status: statusCode, result: err};
    }
};

export default handleRPC;
