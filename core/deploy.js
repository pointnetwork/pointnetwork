const Console = require('../console');
const path = require('path');

class Deploy {
    constructor(ctx) {
        this.ctx = ctx;
    }

    async deploy(deploy_path) {
        let deploy_path_absolute = path.resolve(deploy_path);
        if (deploy_path_absolute.length === 0) return this.ctx.die('error: invalid path');
        await new Console(this.ctx).cmd_api('api/deploy', 'deploy_path='+deploy_path_absolute);
    }
}

module.exports = Deploy;