const Console = require('../console');
const path = require('path');

class Deploy {
    constructor(ctx) {
        this.ctx = ctx;
    }

    async deploy(deploy_path, deploy_contracts = false) {
        let deploy_path_absolute = path.resolve(deploy_path);
        if (deploy_path_absolute.length === 0) return this.ctx.die('error: invalid path');
        const t0 = Date.now();
        const result = await new Console(this.ctx).cmd_api('deploy', "deploy_path="+deploy_path_absolute, "deploy_contracts="+((deploy_contracts)?'true':'false'));
        if (result.error) {
            console.error(result.error);
        }
        const t1 = Date.now();
        this.ctx.log.info(`DEPLOY TIME: ${t1-t0} ms`);
    }

    async migrate(site) {
        if (site.length === 0) return this.ctx.die('error: invalid site');
        const result = await new Console(this.ctx).cmd_api('migrate', "site="+site);
        console.log(result);
    }
}

module.exports = Deploy;