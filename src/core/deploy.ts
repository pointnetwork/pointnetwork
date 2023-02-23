const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('config');
const logger = require('./log');
const log = logger.child({module: 'Deploy'});
const colors = require('ansi-colors');
import {Presets, SingleBar} from 'cli-progress';

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

    log.debug('Starting deployment of ' + deploy_path + '...');

    const deploy_path_absolute = path.resolve(deploy_path);
    if (!deploy_path_absolute) {
        throw new Error('Invalid path');
    }
    if (!fs.existsSync(deploy_path_absolute)) {
        throw new Error(`Path {deploy_path} doesn\'t exist`);
    }

    const POLL_PROGRESS_INTERVAL = 300;

    let lastLineIdx = -1;
    let progressBar: SingleBar = new SingleBar({});

    const pollProgress = async() => {
        try {

            const result = await axios.get(
                `http://localhost:${PORT}/v1/api/deploy/progress`,
                {
                    params: {
                        deploy_path: path.resolve(deploy_path),
                        deploy_contracts,
                        dev,
                        force_deploy_proxy,

                        lastLineIdx
                    }
                }
            );

            if (result.data.status === 'success') {
                for (const line of result.data.lines) {
                    const {idx, msg, obj} = line;

                    // if there's any fresh output, remove progress bar
                    if (progressBar) progressBar.stop();

                    // eslint-disable-next-line no-console
                    console.log('▶', msg, obj || '');
                    lastLineIdx = idx;
                }

                if (result.data.live) {
                    const {total, done} = result.data.live;

                    let val = Number(total); let units = 'b'; let divisor = 1;
                    val = val / 1024; if (Math.floor(val) > 0) { units = 'KB'; divisor *= 1024; }
                    val = val / 1024; if (Math.floor(val) > 0) { units = 'MB'; divisor *= 1024; }
                    val = val / 1024; if (Math.floor(val) > 0) { units = 'GB'; divisor *= 1024; }
                    val = val / 1024; if (Math.floor(val) > 0) { units = 'TB'; divisor *= 1024; }
                    val = val / 1024; if (Math.floor(val) > 0) { units = 'PB'; divisor *= 1024; }

                    const totalDivided = Number((total / divisor).toFixed(2));
                    const doneDivided = Number((done / divisor).toFixed(2));

                    if (!progressBar) {
                        progressBar = new SingleBar({
                            format: String(' ' + /*'|' +*/ colors.cyan('{bar}') + ' {percentage}% | ETA: {eta_formatted} | {value}' + units + '/{total}' + units),
                            etaBuffer: 100
                        }, Presets.shades_classic);
                        progressBar.start(totalDivided, 0);
                    }

                    progressBar.update(doneDivided);
                }

            } else if (result.data.status === 'error') {
                // do nothing
                log.error(result.data, 'Polling progress error');
            }
        } catch (e) {
            // do nothing
        }

        setTimeout(pollProgress, POLL_PROGRESS_INTERVAL);
    };
    setTimeout(pollProgress, POLL_PROGRESS_INTERVAL);

    const start = Date.now();
    const result = await axios.post(
        `http://localhost:${PORT}/v1/api/deploy`,
        {
            deploy_path: path.resolve(deploy_path),
            deploy_contracts,
            dev,
            force_deploy_proxy
        }
    );

    if (progressBar) progressBar.stop();

    if (result.status !== 200) {
        log.error(result, 'Deploy error');
    } else if (result.data.status !== 'success') {
        log.error(result.data);
    }
    log.info(`Deploy time: ${((Date.now() - start) / 1000).toFixed(3)} s`);
};

module.exports = deploy;
