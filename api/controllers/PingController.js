class PingController {
    constructor(ctx) {
        this.ctx = ctx;
    }

    ping() {
        return {'ping': 'pong'}
    }
}

module.exports = PingController;