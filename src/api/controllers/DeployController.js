const logger = require('../../core/log');
const log = logger.child({module: 'DeployController'});

class DeployController {
    constructor(request) {
        this.request = request;
    }

    async deploy() {
        const deploy_path = this.request.query.deploy_path;
        const deploy_contracts =
            this.request.query.deploy_contracts === 'true' ||
            this.request.query.deploy_contracts === '1';
        const dev = this.request.query.dev === 'true' || this.request.query.dev === '1';
        const force_deploy_proxy = this.request.query.force_deploy_proxy === 'true' || this.request.query.force_deploy_proxy === '1';
        if (deploy_path.length === 0) throw new Error('error: deploy path not specified');
        
        try {
            const Deployer = require('../../client/zweb/deployer');
            this.deployer = new Deployer();
            await this.deployer.deploy(deploy_path, deploy_contracts, dev, force_deploy_proxy);
            return {status: 'success'};
        } catch (e) {
            log.error(e, 'DeployController.deploy error');
            return {status: 'error', error: e.toString()};
        }
    }
}

module.exports = DeployController;
