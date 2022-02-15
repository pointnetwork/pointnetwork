const DeployerProgress = require('./zweb/deployer/progress');
const ZProxy = require('./proxy');
const {init: initStorage} = require('./storage/index.js');
const logger = require('../core/log');

class Client {
    constructor(ctx) {
        this.ctx = ctx;
        this.log = logger.child({module: 'Client'});
    }

    async start() {
        await initStorage();

        this.proxy = new ZProxy(this.ctx);
        this.proxy.start();

        this.deployerProgress = new DeployerProgress(this.ctx);
    }
}

module.exports = Client;
