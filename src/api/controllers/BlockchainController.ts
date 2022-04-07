import {FastifyRequest, FastifyReply} from 'fastify';
import PointSDKController from './PointSDKController';
import blockchain from '../../network/blockchain';
import permissionStore from '../../permissions/PermissionStore';

export type RPCRequestBody = {
    id: number;
    method: string;
    params?: unknown[];
};

type HandlerFunc = (req: FastifyRequest) => Promise<{
    status: number;
    result: unknown;
}>;

const permissionHandlers: Record<string, HandlerFunc> = {
    wallet_requestPermissions: async (req: FastifyRequest) => {
        try {
            const dappDomain = req.headers.origin;
            if (!dappDomain) {
                return {status: 400, result: {message: '`Origin` header is required.'}};
            }

            const address = blockchain.getOwner();
            const {params} = req.body as RPCRequestBody;

            // If params is not provided or it's an empty array, revoke all permissions.
            if (!params || !Array.isArray(params) || params.length === 0) {
                const id = await permissionStore.revoke(dappDomain, address);
                return {
                    status: 200,
                    result: {permissionsId: id, message: 'Revoked all permissions.'}
                };
            }

            const allowedMethods = params ? Object.keys(params[0] as Record<string, object>) : [];
            const id = await permissionStore.upsert(dappDomain, address, allowedMethods);
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
    },
    wallet_getPermissions: async (req: FastifyRequest) => {
        const dappDomain = req.headers.origin;
        if (!dappDomain) {
            return {status: 400, result: {message: '`Origin` header is required.'}};
        }

        const address = blockchain.getOwner();
        const permissions = await permissionStore.get(dappDomain, address);
        return {status: 200, result: permissions || null};
    }
};

// Handlers for methods that are not defined in EIP-1474 but that we still support.
// For example, for compatibility with MetaMask's API.
const specialHandlers: Record<string, HandlerFunc> = {
    eth_requestAccounts: async (req: FastifyRequest) => {
        const {params, id} = req.body as RPCRequestBody;
        try {
            const result = await blockchain.send('eth_accounts', params, id);
            return {status: 200, result};
        } catch (err) {
            const statusCode = err.code === -32603 ? 500 : 400;
            return {status: statusCode, result: err};
        }
    }
};

class BlockchainController extends PointSDKController {
    private req: FastifyRequest;
    private reply: FastifyReply;

    constructor(ctx: unknown, req: FastifyRequest, reply: FastifyReply) {
        super(ctx);
        this.req = req;
        this.reply = reply;
    }

    async request() {
        const {method, params, id} = this.req.body as RPCRequestBody;

        // Check for methods related to permissions.
        const permissionHandler = permissionHandlers[method];
        if (permissionHandler) {
            const {status, result} = await permissionHandler(this.req);
            this.reply.status(status);
            return result;
        }

        // Check for non-standard (EIP-1474) methods.
        const specialHandler = specialHandlers[method];
        if (specialHandler) {
            const {status, result} = await specialHandler(this.req);
            this.reply.status(status);
            return result;
        }

        // `method` is a standard RPC method (EIP-1474).
        try {
            // TODO: do some input validation because sending wrong params could cause a crash.
            const result = await blockchain.send(method, params, id);
            return result;
        } catch (err) {
            // As per EIP-1474, -32603 means internal error.
            const statusCode = err.code === -32603 ? 500 : 400;
            this.reply.status(statusCode);
            return this._status(statusCode)._response(err);
        }
    }
}

// Need to keep it like this because of the way it's imported.
module.exports = BlockchainController;
