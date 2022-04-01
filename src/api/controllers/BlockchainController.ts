import {FastifyRequest, FastifyReply} from 'fastify';
import PointSDKController from './PointSDKController';
import blockchain from '../../network/blockchain';
import permissionStore from '../../permissions/PermissionStore';

export type RPCRequestBody = {
    method: string;
    params?: unknown[];
};

type PermissionHandlerFunc = (
    req: FastifyRequest
) => Promise<{
    status: number;
    result: unknown;
}>;

const permissionHandlers: Record<string, PermissionHandlerFunc> = {
    wallet_requestPermissions: async (req: FastifyRequest) => {
        try {
            const dappDomain = req.headers.origin;
            if (!dappDomain) {
                return {status: 400, result: {message: '`Origin` header is required.'}};
            }

            const {params} = req.body as RPCRequestBody;
            const address = blockchain.getOwner();
            const allowedMethods = params ? Object.keys(params[0] as Record<string, object>) : [];

            const id = await permissionStore.upsert(dappDomain, address, allowedMethods);
            return {status: 200, result: {permissionsId: id}};
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

class BlockchainController extends PointSDKController {
    private req: FastifyRequest;
    private reply: FastifyReply;

    constructor(ctx: unknown, req: FastifyRequest, reply: FastifyReply) {
        super(ctx);
        this.req = req;
        this.reply = reply;
    }

    async request() {
        const {method, params} = this.req.body as RPCRequestBody;

        // If `method` is about permissions, use the corresponding handler.
        const permissionHandler = permissionHandlers[method];
        if (permissionHandler) {
            const {status, result} = await permissionHandler(this.req);
            return this._status(status)._response(result);
        }

        // `method` is not about permissions.
        try {
            // TODO: do some input validation because sending wrong params could cause a crash.
            const result = await blockchain.send(method, params);
            return this._response(result);
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
