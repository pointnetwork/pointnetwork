const DeployerProgress = require('./zweb/deployer/progress');
const ZProxy = require('./proxy');

class Client {
    constructor(ctx) {
        this.ctx = ctx;
        this.log = ctx.log.child({module: 'Client'});
        this.config = ctx.config.client;
    }

    async start() {
        let Storage;
        if (this.ctx.config.client.storage.engine && this.ctx.config.client.storage.engine === 'arweave') {
            Storage = require('./storage/index-arweave');
        } else {
            Storage = require('./storage');
        }
        this.storage = new Storage(this.ctx);
        this.storage.start();

        this.proxy = new ZProxy(this.ctx);
        this.proxy.start();

        this.deployerProgress = new DeployerProgress(this.ctx);
    }
}

module.exports = Client;
