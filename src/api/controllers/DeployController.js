const Deployer = require('../../client/zweb/deployer');
import logger from '../../core/log';
const log = logger.child({module: 'DeployController'});

const deploys = {};

class DeployController {
    constructor(request) {
        this.request = request;
    }

    _progressKey(params) {
        const {
            deploy_path,
            deploy_contracts,
            dev,
            force_deploy_proxy,
            deploy_config
        } = params;

        return [deploy_path, deploy_contracts, dev, force_deploy_proxy, deploy_config].join('|||');
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
            const progressKey = this._progressKey(this.request.body);

            deploys[progressKey] = new Deployer();

            this._log(progressKey, 'Starting...');

            await deploys[progressKey].deploy({
                deployPath: deploy_path,
                deployContracts: deploy_contracts,
                dev,
                forceDeployProxy: force_deploy_proxy,
                config: deploy_config
            });
            return {status: 'success'};
        } catch (e) {
            log.error({message: e.message, stack: e.stack}, 'DeployController.deploy error');
            return {status: 'error', error: e.message};
        }
    }

    async deployProgress() {
        const {
            deploy_path,
            // deploy_contracts,
            // dev,
            // force_deploy_proxy,
            // deploy_config,

            lastLineIdx
        } = this.request.query;

        if (!deploy_path) {
            return {status: 'error', error: 'deploy path not specified'};
        }

        const progressKey = this._progressKey(this.request.query);
        const deployer = deploys[progressKey];
        if (!deployer) {
            return {status: 'error', error: 'deployer not found'};
        }

        const lines = [];
        let line = null;
        for (const idx in deployer.progressLines) {
            if (idx <= lastLineIdx) continue;
            line = deployer.progressLines[idx];
            lines.push({idx, msg:line.msg, obj:line.obj});
        }

        const lastLine = deployer.progressLines[lastLineIdx];

        // If there is a line, use its callback
        let cb;
        if (line) {
            cb = line.cb;
        } else {
            if (lastLineIdx === -1) {
                cb = null;
            } else {
                if (lastLine) {
                    cb = lastLine.cb;
                } else {
                    cb = null;
                }
            }
        }
        
        const live = (cb) ? await cb() : null;

        return {status: 'success', lines, live};
    }

    _log(progressKey, msg, obj = {}) {
        deploys[progressKey].progressMsg = msg;
        deploys[progressKey].progressObj = obj;
    }
}

module.exports = DeployController;
