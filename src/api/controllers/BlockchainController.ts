import {FastifyRequest, FastifyReply} from 'fastify';
import config from 'config';
const PointSDKController = require('./PointSDKController');
import handleRPC, {RPCRequest} from '../../rpc/rpc-handlers';

const networks: Record<string, {
  type: string;
  name: string;
  currency_name: string;
  currency_code: string;
  tokens: unknown[];
}> = config.get('network.web3');
const DEFAULT_NETWORK: string = config.get('network.default_network');

class BlockchainController extends PointSDKController {
    private req: FastifyRequest;
    private reply: FastifyReply;

    constructor(req: FastifyRequest, reply: FastifyReply) {
        super(req);
        this.req = req;
        this.reply = reply;
    }

    async request() {
        const body = this.req.body as RPCRequest;
        const {status, result} = await handleRPC({...body, origin: this.req.headers.origin});
        this.reply.status(status);
        return result;
    }

    async networks () {
        this.reply.status(200);
        return {
            networks: Object.keys(networks).reduce(
                (acc, cur) => ({
                    ...acc,
                    [cur]: {
                        type: networks[cur].type,
                        name: networks[cur].name,
                        currency_name: networks[cur].currency_name,
                        currency_code: networks[cur].currency_code,
                        tokens: networks[cur].tokens
                    }
                }),
                {}
            ),
            default_network: DEFAULT_NETWORK
        };
    }
}

// Need to keep it like this because of the way it's imported.
module.exports = BlockchainController;
