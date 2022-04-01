const ApiServer = require('../api');
const Client = require('../client');
const Wallet = require('../wallet');

class Core {
    constructor(ctx) {
        this.ctx = ctx;
    }

    async start() {
        await this.initApiServer();
        await this.initWallet();
        await this.initClient();
        await this.postInit();
    }

    async postInit() {
        // await this.ctx.wallet.saveDefaultWalletToKeystore();

        setTimeout(async () => {
            // Here we can put something that will run at each node start, but better not to
        }, 0);
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

    async initWallet() {
        // todo: rename to keychain?
        this.ctx.wallet = new Wallet(this.ctx);
        await this.ctx.wallet.start();
    }
}

module.exports = Core;
