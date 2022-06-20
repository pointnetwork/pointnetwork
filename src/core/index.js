const ApiServer = require('../api');
const Client = require('../client');

class Core {
    constructor(ctx) {
        this.ctx = ctx;
    }

    async start() {
        await this.initApiServer();
        await this.initClient();
    }

    async initApiServer() {
        const api_server = new ApiServer(this.ctx);
        this.ctx.api_server = api_server;
        await api_server.start();
    }

    async initClient() {
        this.ctx.client = new Client(this.ctx);
        await this.ctx.client.start();
    }
}

module.exports = Core;
