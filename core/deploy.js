const Console = require('../console');
const path = require('path');

class Deploy {
    constructor(ctx) {
        this.ctx = ctx;
        this.log = ctx.log.child({module: 'Deploy'});
    }

    async deploy(deploy_path, deploy_contracts = false, dev = false) {
        const deploy_path_absolute = path.resolve(deploy_path);
        if (deploy_path_absolute.length === 0) return this.ctx.die('error: invalid path');
        const start = Date.now();
        const result = await new Console(this.ctx).cmd_api('deploy', "deploy_path="+deploy_path_absolute, "deploy_contracts="+((deploy_contracts)?'true':'false'), "dev="+((dev)?'true':'false'));
        if (result.error) {
            this.log.error(result, 'Deploy error');
        }
        this.log.info(`Deploy time: ${Date.now() - start} ms`);
    }

    async migrate(site) {
        if (site.length === 0) return this.ctx.die('error: invalid site');
        const result = await new Console(this.ctx).cmd_api('migrate', "site="+site);
        this.log.info(result);
    }
}

module.exports = Deploy;