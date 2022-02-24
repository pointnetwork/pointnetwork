import {Command} from 'commander';
import path from 'path';
import {existsSync, writeFileSync} from 'fs';
import lockfile from 'proper-lockfile';
import disclaimer from './disclaimer';
import {resolveHome} from './core/utils';

if ((process as typeof process & {pkg?: unknown}).pkg !== undefined) {
    // when running inside the packaged version the configuration should be
    // retrieved from the internal packaged config
    // by default config library uses process.cwd() to reference the config folder
    // when using vercel/pkg process.cwd references real folder and not packaged folder
    // overwriting this env variable fixes the problems
    process.env.NODE_CONFIG_DIR = path.resolve(__dirname, '..', 'config');
}

type ProgramType = InstanceType<typeof Command> & {
    datadir?: string
};

const program: ProgramType = new Command();

// Disable https://nextjs.org/telemetry
process.env['NEXT_TELEMETRY_DISABLED'] = '1';

// TODO: Enabled this option for backward-compatibility support, but remove later to support newer syntax
program.storeOptionsAsProperties();

program.version(process.env.npm_package_version || 'No version is specified');

program.description(`
    Point Network
    https://pointnetwork.io/

    Licensed under MIT license.
`);

// Print disclaimer
disclaimer.output();

program.option('-d, --datadir <path>', 'path to the data directory');
program.parse(process.argv);

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

if (process.env.MODE === 'e2e' || process.env.MODE === 'zappdev') {
    process.env.IDENTITY_CONTRACT_ADDRESS = getContractAddress('Identity');
    process.env.STORAGE_PROVIDER_REGISTRY_CONTRACT_ADDRESS = getContractAddress('StorageProviderRegistry');
}

const config = require('config');
const logger = require('./core/log.js');
const Model = require('./db/model.js');
const Point = require('./core/index.js');

// ------------------- Init Logger ----------------- //

const log = logger.child({module: 'point'});

export type CtxType = Record<string, unknown> & {
    basepath: string;
    exit: (code: number) => void;
    die: (err: Error) => void;
    db?: {shutdown?: () => Promise<undefined>};
};

const ctx: CtxType = {
    basepath: __dirname,
    exit: (code: number) => (log.close(), process.exit(code)),
    die: (err: Error) => (log.fatal(err), ctx.exit(1))
};

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

const lockfilePath = path.join(resolveHome(config.get('datadir')), 'point');

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
