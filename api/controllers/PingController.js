const PointSDKController = require('./PointSDKController');

class PingController extends PointSDKController {
    constructor(ctx, req) {
        super(ctx, req);
    }

    ping() {
        return this._response(
            {'ping': 'pong'}
        );
    }
}

module.exports = PingController;