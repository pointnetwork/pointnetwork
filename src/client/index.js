import DeployerProgress from './web/deployer/progress';
import startProxy from './proxy';
import {init} from './storage';

class Client {
    constructor(ctx) {
        this.ctx = ctx;
    }

    async start() {
        this.deployerProgress = new DeployerProgress(this.ctx);
        await Promise.all([
            init(),
            startProxy(this.ctx)
        ]);
    }
}

module.exports = Client;
