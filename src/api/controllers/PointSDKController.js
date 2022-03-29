class PointSDKController {
    constructor(ctx) {
        this.ctx = ctx;
        this.status = 200;
    }

    _status(statusCode) {
        if (!Number.isNaN(Number(statusCode))) {
            this.status = statusCode;
        }
        return this;
    }

    _response(payload) {
        return {
            status: this.status,
            data: payload
        };
    }
}

module.exports = PointSDKController;
