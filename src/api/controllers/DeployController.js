const Deployer = require('../../client/zweb/deployer_old');
const logger = require('../../core/log');
const log = logger.child({module: 'DeployController'});

class DeployController {
    constructor(request) {
        this.request = request;
    }

    async deploy() {
        const {
            deploy_path,
            deploy_contracts,
            dev,
            force_deploy_proxy,
            deploy_config
        } = this.request.body;

        if (!deploy_path) {
            return {status: 'error', error: 'deploy path not specified'};
        }
        
        try {
            this.deployer = new Deployer();
            await this.deployer.deploy({
                deployPath: deploy_path,
                deployContracts: deploy_contracts,
                dev,
                forceDeployProxy: force_deploy_proxy,
                config: deploy_config
            });
            return {status: 'success'};
        } catch (e) {
            log.error(e, 'DeployController.deploy error');
            return {status: 'error', error: e.toString()};
        }
    }
}

module.exports = DeployController;
