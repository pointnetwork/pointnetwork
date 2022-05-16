import {FastifyRequest, FastifyReply} from 'fastify';
import config from 'config';
const PointSDKController = require('./PointSDKController');
import handleRPC, {RPCRequest} from '../../rpc/rpc-handlers';

class BlockchainController extends PointSDKController {
    private req: FastifyRequest;
    private reply: FastifyReply;

    constructor(ctx: unknown, req: FastifyRequest, reply: FastifyReply) {
        super(ctx, req);
        this.req = req;
        this.reply = reply;
    }

    async request() {
        // Check Auth
        const SDK_AUTH_KEY = config.get('api.sdk_auth_key');
        if (this.req.headers.authorization !== `Bearer ${SDK_AUTH_KEY}`) {
            this.reply.status(401);
            return {message: 'Missing or invalid auth token.'};
        }

        const body = this.req.body as RPCRequest;
        const {status, result} = await handleRPC({...body, origin: this.req.headers.origin});
        this.reply.status(status);
        return result;
    }
}

// Need to keep it like this because of the way it's imported.
module.exports = BlockchainController;
