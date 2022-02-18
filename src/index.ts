import {Command} from 'commander';
import path from 'path';
import {existsSync, writeFileSync} from 'fs';
import lockfile from 'proper-lockfile';
import disclaimer from './disclaimer';

const program: any = new Command();

// Disable https://nextjs.org/telemetry
process.env['NEXT_TELEMETRY_DISABLED'] = '1';

// TODO: Enabled this option for backward-compatibility support, but remove later to support newer syntax
program.storeOptionsAsProperties();

program.version(process.env.npm_package_version);

program.description(`
    Point Network
    https://pointnetwork.io/

    Licensed under MIT license.
`);

// Print disclaimer
disclaimer.output();

program.option('--datadir <path>', 'path to the data directory');
program.parse(process.argv);

const ctx: Record<string, any> = {};

if (program.datadir) {
    process.env.DATADIR = program.datadir;
}

const getContractAddress = (name: string) => {
    const filename = path.resolve(__dirname, '..', 'truffle', 'build', 'contracts', `${name}.json`);

    if (!existsSync(filename)) {
        return;
    }

    const {networks} = require(filename);

    for (const network in networks) {
        const {address} = networks[network];
        if (address && typeof address === 'string') {
            return address;
        }
    }
};

// ------------------ Patch Config ------------ //

if (process.env.MODE === 'e2e') {
    process.env.IDENTITY_CONTRACT_ADDRESS = getContractAddress('Identity');
    process.env.STORAGE_PROVIDER_REGISTRY_CONTRACT_ADDRESS = getContractAddress('StorageProviderRegistry');
}

const config = require('config');
const logger = require('./core/log.js');
const Model = require('./db/model.js');
const Point = require('./core/index.js');

ctx.basepath = __dirname;

// ------------------- Init Logger ----------------- //

const log = logger.child({module: 'point'});

ctx.exit = (code: number) => (log.close(), process.exit(code));
ctx.die = (err: Error) => (log.fatal(err), ctx.exit(1));

// ------------------ Gracefully exit ---------------- //

let exiting = false;
async function _exit(sig: typeof sigs[number]) {
    if (exiting) return;
    exiting = true;

    const errors = [];

    log.info('Received signal ' + sig + ', shutting down...');

    try {
        if (ctx.db && ctx.db.shutdown) await ctx.db.shutdown();
    } catch (e) {
        errors.push('Error while shutting down database: ' + e);
    }

    if (errors.length) {
        for (const e of errors) {
            log.error(e);
        }
    } else {
        log.info('Successfully shut down.');
    }

    process.exit(1);

    // todo: shut down everything else
}

const sigs = [
    'SIGHUP',
    'SIGINT',
    'SIGQUIT',
    'SIGILL',
    'SIGTRAP',
    'SIGABRT',
    'SIGBUS',
    'SIGFPE',
    'SIGUSR1',
    'SIGSEGV',
    'SIGUSR2',
    'SIGTERM'
] as const;
sigs.forEach(function (sig) {
    process.on(sig, function () {
        _exit(sig);
    });
});

process.on('uncaughtException', err => {
    log.error({message: err.message, stack: err.stack}, 'Error: uncaught exception');
});

process.on('unhandledRejection', (err: Error, second) => {
    log.debug(err, second);
    log.error({message: err.message, stack: err.stack}, 'Error: unhandled rejection');
});

Model.setCtx(ctx);

// ------------------- Start Point ------------------- //

// This is just a dummy file: proper-lockfile handles the lockfile creation,
// but it's intended to lock some existing file
const lockfilePath = path.join(config.get('datadir'), 'point');
if (!existsSync(lockfilePath)) {
    writeFileSync(lockfilePath, 'point');
}
lockfile.lock(lockfilePath)
    .then(() => {
        const point = new Point(ctx);
        point.start();
    })
    .catch(err => {
        log.error({err}, 'Failed to create lockfile, is point already running?');
        process.exit(1);
    });
