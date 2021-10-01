const DeployerProgress = require('./zweb/deployer/progress');

class Client {
    constructor(ctx) {
        this.ctx = ctx;
        this.config = ctx.config.client;
    }

    async start() {
        await this.init();

        // todo: rewrite with threads!
        this.timeout = this.ctx.config.simulation_delay;
        this.timerFn = null;
        this.timerFn = async() => {
            await this.cycle();
            setTimeout(this.timerFn, this.timeout);
        };
        this.timerFn();
    }

    async init() {
        let Storage;
        if (this.ctx.config.client.storage.engine && this.ctx.config.client.storage.engine === 'arweave') {
            Storage = require('./storage/index-arweave');
        } else {
            Storage = require('./storage');
        }
        this.storage = new Storage(this.ctx);
        this.storage.start();

        const ZProxy = require('./proxy');
        this.proxy = new ZProxy(this.ctx);
        this.proxy.start();

        this.deployerProgress = new DeployerProgress(this.ctx);

        // start other services
    }

    async cycle() {
        // todo
    }
}

module.exports = Client;