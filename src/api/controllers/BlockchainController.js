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
            // TODO: improve error handling so a more appropriate error code can be sent in the response.
            return this._status(400)._response(err);
        }
    }
}

module.exports = BlockchainController;
