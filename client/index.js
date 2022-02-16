const DeployerProgress = require('./zweb/deployer/progress');
const ZProxy = require('./proxy');
const {init: initStorage} = require('./storage/index.js');

class Client {
    constructor(ctx) {
        this.ctx = ctx;
    }

    async start() {
        await initStorage(this.ctx);

        this.proxy = new ZProxy(this.ctx);
        this.proxy.start();

        this.deployerProgress = new DeployerProgress(this.ctx);
    }
}

module.exports = Client;
