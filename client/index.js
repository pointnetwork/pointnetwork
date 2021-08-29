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
        const Storage = require('./storage');
        this.storage = new Storage(ctx);
        this.storage.start();

        const ZProxy = require('./proxy');
        this.proxy = new ZProxy(ctx);
        this.proxy.start();

        this.deployerProgress = new DeployerProgress(ctx);

        // start other services
    }

    async cycle() {
        // todo
    }
}

module.exports = Client;