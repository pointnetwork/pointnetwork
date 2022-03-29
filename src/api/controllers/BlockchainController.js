const PointSDKController = require('./PointSDKController');
const blockchain = require('../../network/blockchain');

const rpcErrors = {
    userRejected: {
        code: 4001,
        name: 'User Rejected Request'
    },
    unauthorized: {
        code: 4100,
        name: 'Unauthorized'
    },
    unsupportedMethod: {
        code: 4200,
        name: 'Unsupported Method'
    },
    diconnected: {
        code: 4900,
        name: 'Disconnected'
    },
    chainDisconnected: {
        code: 4901,
        name: 'Chain Disconnected'
    },
    parseError: {
        code: -32700,
        name: 'Parse error'
    },
    invalidRequest: {
        code: -32600,
        name: 'Invalid request'
    },
    methodNotFound: {
        code: -32601,
        name: 'Method not found'
    },
    invalidParams: {
        code: -32602,
        name: 'Invalid params'
    },
    internalError: {
        code: -32603,
        name: 'Internal error'
    }
};

const internalErrorResp = (message, data) => {
    const result = {
        ...rpcErrors.internalError,
        message,
        data
    };
    return {status: 500, result};
};

const rpcMethodsHandlers = {
    eth_accounts: async () => {
        const address = blockchain.getOwner();
        return {status: 200, result: [address]};
    },
    eth_blockNumber: async () => {
        const blockNumber = await blockchain.getBlockNumber('hex');
        return {status: 200, result: blockchain.toHex(blockNumber)};
    },
    eth_getBalance: async req => {
        const {params} = req.body;
        if (!params || !Array.isArray(params) || params.length === 0) {
            const result = {
                ...rpcErrors.invalidParams,
                message: 'Expected at least 1 param, address is a required param.',
                data: params
            };
            return {status: 400, result};
        }

        const [address, blockIdentifier] = params;
        try {
            const balance = await blockchain.getBalance(address, blockIdentifier);
            return {status: 200, result: blockchain.toHex(balance)};
        } catch (err) {
            if ((err.message || '').includes(`Provided address ${address} is invalid`)) {
                const result = {
                    ...rpcErrors.invalidParams,
                    message: err.message,
                    data: params
                };
                return {status: 400, result};
            } else {
                return internalErrorResp(err.message, params);
            }
        }
    }
};

class BlockchainController extends PointSDKController {
    constructor(ctx, req) {
        super(ctx);
        this.req = req;
    }

    async request() {
        const {method} = this.req.body;
        const handler = rpcMethodsHandlers[method];

        if (!handler) {
            // RPC method not yet implemented
            return this._status(400)._response({
                ...rpcErrors.unsupportedMethod,
                message: `Method: "${method}" is not yet supported.`,
                data: null
            });
        }

        const {status, result} = await handler(this.req);
        return this._status(status)._response(result);
    }
}

module.exports = BlockchainController;
