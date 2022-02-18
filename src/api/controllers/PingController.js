const PointSDKController = require('./PointSDKController.js');

class PingController extends PointSDKController {
    constructor(ctx) {
        super(ctx);
    }

    ping() {
        return this._response({ping: 'pong'});
    }
}

module.exports = PingController;
