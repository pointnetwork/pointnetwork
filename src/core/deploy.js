const fs = require('fs');
const path = require('path');
const Deployer = require('../client/zweb/deployer_old');
const logger = require('./log');

const log = logger.child({module: 'Deploy'});

const deploy = async ({
    deploy_path = null,
    deploy_contracts = false,
    dev = false,
    force_deploy_proxy = false
}) => {
    if (deploy_path === null) {
        deploy_path = path.resolve('.');
        if (!fs.existsSync(path.join(deploy_path, 'point.deploy.json'))) {
            throw new Error(
                'Empty path given, and point.deploy.json is not found here. ' +
                    'Are you sure you are in a dApp directory?'
            );
        }
    }

    log.debug('Starting deployment of ' + deploy_path + '...');

    const deploy_path_absolute = path.resolve(deploy_path);
    if (!deploy_path_absolute) {
        throw new Error(`Invalid path ${deploy_path}`);
    }
    if (!fs.existsSync(deploy_path_absolute)) {
        throw new Error(`Path ${deploy_path_absolute} doesn't exist`);
    }

    const start = Date.now();

    try {
        const deployer = new Deployer();
        await deployer.deploy({
            deployPath: deploy_path_absolute,
            deployContracts: deploy_contracts,
            dev,
            forceDeployProxy: force_deploy_proxy
        });
    } catch (err) {
        log.error(err, 'Deployment error');
    }

    log.info(`Deploy time: ${Date.now() - start} ms`);
};

module.exports = deploy;
