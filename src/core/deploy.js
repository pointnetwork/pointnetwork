const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('config');
const logger = require('./log');
const log = logger.child({module: 'Deploy'});

const PORT = Number(config.get('api.port'));

const deploy = async ({
    deploy_path = null,
    deploy_contracts = false,
    dev = false,
    force_deploy_proxy = false
}) => {
    if (deploy_path === null) {
        deploy_path = path.resolve('.');
        if (!fs.existsSync(path.join(deploy_path, 'point.deploy.json'))) {
            throw new Error('Empty path given, and point.deploy.json is not found here. ' +
                'Are you sure you\'re in a dApp directory?');
        }
    }

    const deploy_path_absolute = path.resolve(deploy_path);
    if (!deploy_path_absolute) {
        throw new Error('Invalid path');
    }
    if (!fs.existsSync(deploy_path_absolute)) {
        throw new Error(`Path {deploy_path} doesn\'t exist`);
    }

    const start = Date.now();
    const result = await axios.post(
        `http://localhost:${PORT}/v1/api/deploy`,
        {
            deploy_path,
            deploy_contracts,
            dev,
            force_deploy_proxy
        }
    );
    if (result.status !== 200) {
        log.error(result, 'Deploy error');
    }
    log.info(`Deploy time: ${Date.now() - start} ms`);
};

module.exports = deploy;
