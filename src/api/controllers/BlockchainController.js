const PointSDKController = require('./PointSDKController');
const blockchain = require('../../network/blockchain');

class BlockchainController extends PointSDKController {
    constructor(ctx, req) {
        super(ctx);
        this.req = req;
    }

    async request() {
        const {method, params} = this.req.body;
        try {
            // TODO: do some input validation because sending wrong params could cause a crash.
            const result = await blockchain.send(method, params);
            return this._status(200)._response(result);
        } catch (err) {
            // As per EIP-1474, -32603 means internal error.
            const statusCode = err.code === -32603 ? 500 : 400;
            return this._status(statusCode)._response(err);
        }
    }
}

module.exports = BlockchainController;
