// TODO: it became useless, refactor
class PointSDKController {
    constructor() {
        this.status = 200;
    }

    _status(statusCode) {
        if (!Number.isNaN(Number(statusCode))) {
            this.status = statusCode;
        }
        return this;
    }

    _response(payload, headers = {}) {
        return {
            status: this.status,
            data: payload,
            headers: headers
        };
    }
}

module.exports = PointSDKController;
