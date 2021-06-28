const PointSDKController = require('./PointSDKController')

class PingController extends PointSDKController {
    constructor(ctx) {
        super(ctx);
    }

    ping() {
        return this._response(
            {'ping': 'pong'}
        );
    }
}

module.exports = PingController;