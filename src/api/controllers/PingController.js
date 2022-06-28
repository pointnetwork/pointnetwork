const PointSDKController = require('./PointSDKController');

class PingController extends PointSDKController {
    constructor(req) {
        super(req);
    }

    ping() {
        return this._response({ping: 'pong'});
    }
}

module.exports = PingController;
