const Console = require('../console');
const path = require('path');

class Deploy {
    constructor(ctx) {
        this.ctx = ctx;
    }

    async deploy(deploy_path) {
        let deploy_path_absolute = path.resolve(deploy_path);
        if (deploy_path_absolute.length === 0) return this.ctx.die('error: invalid path');
        const _console = new Console(this.ctx);
        await _console.cmd_api('deploy', 'deploy_path='+deploy_path_absolute);
    }
}

module.exports = Deploy;