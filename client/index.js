const DeployerProgress = require('./zweb/deployer/progress');
const ZProxy = require('./proxy');
const {init: initStorage} = require('./storage/index-new.js');

class Client {
    constructor(ctx) {
        this.ctx = ctx;
        this.config = ctx.config.client;
    }

    async start() {
        await initStorage(this.ctx);

        this.proxy = new ZProxy(this.ctx);
        this.proxy.start();

        this.deployerProgress = new DeployerProgress(this.ctx);
    }
}

module.exports = Client;
