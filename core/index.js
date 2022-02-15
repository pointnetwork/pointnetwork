const ApiServer = require('../api');
const Network = require('../network');
const Client = require('../client');
const Wallet = require('../wallet');
const logger = require('../core/log');

class Core {
    constructor(ctx) {
        this.ctx = ctx;
        this.log = logger.child({module: 'Core'});
    }

    async start() {
        await this.initApiServer();
        await this.initWallet();
        await this.initNetwork();
        await this.initClient();
        await this.postInit();
    }

    async postInit() {
        await this.ctx.wallet.saveDefaultWalletToKeystore();

        setTimeout(async () => {
            // Here we can put something that will run at each node start, but better not to
        }, 0);
    }

    async initApiServer() {
        const api_server = new ApiServer(this.ctx);
        this.ctx.api_server = api_server;
        await api_server.start();
    }

    async initNetwork() {
        this.ctx.network = new Network(this.ctx);
        await this.ctx.network.start();
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
