class DeployController {
    constructor(ctx, request) {
        this.ctx = ctx;
        this.request = request;
    }

    async deploy() {
        const deploy_path = this.request.query.deploy_path;
        const deploy_contracts = (this.request.query.deploy_contracts==='true' || this.request.query.deploy_contracts==='1');
        const staging = (this.request.query.staging==='true' || this.request.query.staging==='1');
        if (deploy_path.length === 0) throw new Error('error: deploy path not specified');

        try {
            const Deployer = require('../../client/zweb/deployer');
            this.deployer = new Deployer(this.ctx);
            await this.deployer.deploy(deploy_path, deploy_contracts, staging);
            return {'status': 'success'};
        } catch(e) {
            return {'status': 'error', 'error': e.toString()};
        }
    }
}

module.exports = DeployController;