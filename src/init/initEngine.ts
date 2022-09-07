import path from 'path';
import {existsSync, promises as fs} from 'fs';
import config from 'config';
import lockfile from 'proper-lockfile';
import startPoint from '../core/index';
import migrate from '../util/migrate';
import initFolders from './initFolders';
import {resolveHome} from '../util';
import logger from '../core/log';

const log = logger.child({module: 'point'});

async function initEngine() {
    // This is just a dummy file: proper-lockfile handles the lockfile creation,
    // but it's intended to lock some existing file
    const lockfilePath = path.join(resolveHome(config.get('datadir')), 'point');

    try {
        await initFolders();
    } catch (err) {
        log.fatal(err, 'Failed to create folders');
        throw 11; // TODO: use `point-errors-code` once available.
    }

    try {
        if (!existsSync(lockfilePath)) {
            await fs.writeFile(lockfilePath, 'point');
        }
        await lockfile.lock(lockfilePath, {stale: 5000});
    } catch (err) {
        log.fatal(err, 'Failed to create lockfile, is point already running?');
        throw 12; // TODO: use `point-errors-code` once available.
    }

    try {
        await migrate();
    } catch (err) {
        log.fatal(err, 'Failed to run database migrations');
        throw 13; // TODO: use `point-errors-code` once available.
    }

    try {
        log.info({env: config.util.getEnv('NODE_ENV')}, 'Starting Point Node');
        await startPoint();
    } catch (err) {
        log.fatal(err, 'Failed to start Point Node');
        throw 1;
    }
}

export default initEngine;
