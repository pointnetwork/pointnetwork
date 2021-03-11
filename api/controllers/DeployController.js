class DeployController {
    constructor(ctx, request) {
        this.ctx = ctx;
        this.request = request;
        this.deployerProgress = require('../../client/zweb/deployer/progress')
    }

    async deploy() {
        const deploy_path = this.request.query.deploy_path;
        if (deploy_path.length === 0) throw new Error('error: deploy path not specified');

        try {
            const Deployer = require('../../client/zweb/deployer');
            this.deployer = new Deployer(this.ctx, this.deployerProgress);
            await this.deployer.deploy(deploy_path);
            return {'status': 'success'};
        } catch(e) {
            return {'status': 'error', 'error': e.toString()};
        }
    }
}

module.exports = DeployController;