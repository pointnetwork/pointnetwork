const Console = require('../console');
const path = require('path');
const logger = require('./log');
const log = logger.child({module: 'Deploy'});

class Deploy {
    async deploy(deploy_path, deploy_contracts = false, dev = false) {
        const deploy_path_absolute = path.resolve(deploy_path);
        if (!deploy_path_absolute) {
            throw new Error('invalid path');
        }
        const start = Date.now();
        const result = await new Console().cmd_api(
            'deploy',
            'deploy_path=' + deploy_path_absolute,
            'deploy_contracts=' + (deploy_contracts ? 'true' : 'false'),
            'dev=' + (dev ? 'true' : 'false')
        );
        if (result.error) {
            log.error(result, 'Deploy error');
        }
        log.info(`Deploy time: ${Date.now() - start} ms`);
    }
}

module.exports = Deploy;
