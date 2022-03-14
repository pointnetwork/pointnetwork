/* eslint-disable @typescript-eslint/ban-ts-comment */
import path from 'path';
import {existsSync, mkdirSync, promises} from 'fs';
import lockfile from 'proper-lockfile';
import {Command} from 'commander';
import disclaimer from './disclaimer';
import {resolveHome} from './core/utils';
import {getContractAddress, compileContract} from './util/contract';

export const RUNNING_PKG_MODE = Boolean((process as typeof process & {pkg?: unknown}).pkg);

if (RUNNING_PKG_MODE) {
    // when running inside the packaged version the configuration should be
    // retrieved from the internal packaged config
    // by default config library uses process.cwd() to reference the config folder
    // when using vercel/pkg process.cwd references real folder and not packaged folder
    // overwriting this env variable fixes the problems
    process.env.NODE_CONFIG_DIR = path.resolve(__dirname, '..', 'config');
}

disclaimer.output();

// Disable https://nextjs.org/telemetry
process.env['NEXT_TELEMETRY_DISABLED'] = '1';

const program: ProgramType<typeof Command> = new Command();

// TODO: Enabled this option for backward-compatibility support, but remove later to support newer syntax
program.storeOptionsAsProperties();

program.version(process.env.npm_package_version || 'No version is specified');
program.description(`
    Point Network
    https://pointnetwork.io/

    Licensed under MIT license.
`);

program.option('-d, --datadir <path>', 'path to the data directory');
program.option('-v, --verbose', 'force the logger to show debug level messages', false);

program
    .command('start', {isDefault: true})
    .description('start the node');
program
    .command('attach')
    .description('attach to the running point process')
    .action(() => void (program.attach = true));
program
    .command('makemigration')
    .description('[dev mode] auto create db migrations from models')
    .action(() => void (program.makemigration = true));
program
    .command('migrate')
    .description('[dev mode] run migrations')
    .action(() => void (program.migrate = true));
program
    .command('compile')
    .description('compile contracts')
    .action(() => void (program.compile = true));
program
    .command('migrate:undo')
    .description('[dev mode] undo migration')
    .action(() => void (program.migrate = program.migrate_undo = true));
program
    .command('debug-destroy-everything')
    .description('destroys everything in datadir: database and files. dangerous!')
    .action(() => void (program.debug_destroy_everything = true));
program
    .command('deploy <path>')
    .description('deploy a website')
    .action((path, cmd) => {
        program.deploy = path;
        program.deploy_contracts = Boolean(cmd.contracts);
        program.dev = Boolean(cmd.dev);
    })
    .option('--contracts', '(re)deploy contracts too', false)
    .option('--dev', 'deploy zapp to dev too', false);

// program.option('--shutdown', 'sends the shutdown signal to the daemon'); // todo
// program.option('--daemon', 'sends the daemon to the background'); // todo
// program.option('--rpc <method> [params]', 'send a command to the daemon'); // todo

program.parse(process.argv);

// ------------------ Patch Config ------------ //

if (program.datadir) {
    process.env.DATADIR = program.datadir;
}


if (process.env.MODE === 'e2e' || process.env.MODE === 'zappdev') {
    process.env.IDENTITY_CONTRACT_ADDRESS = getContractAddress('Identity');
}

// Warning: the below imports should take place after the above config patch!

import config from 'config';
import logger from './core/log.js';
import Point from './core/index.js';
import migrate from './util/migrate';
import initFolders from './initFolders';

// ------------------- Init Logger ----------------- //

const log = logger.child({module: 'point'});
const ctx: CtxType = {
    basepath: __dirname,
    exit: (code: number) => (log.close(), process.exit(code)),
    die: (err: Error) => (log.fatal(err), ctx.exit(1))
};

// ----------------- Console Mode -------------------- //

if (program.attach) {
    const Console = require('./console');
    const console = new Console();
    console.start();
    // @ts-ignore
    return;
}

// -------------------- Deployer --------------------- //

if (program.deploy) {
    const Deploy = require('./core/deploy');
    const deploy = new Deploy();
    deploy.deploy(program.deploy, program.deploy_contracts, program.dev)
        .then(ctx.exit)
        .catch(ctx.die);
    // @ts-ignore
    return;
}

// ---------------- Migration Modes ---------------- //

if (program.makemigration) {
    // A little hack: prepare sequelize-auto-migrations for reading from the current datadir config
    process.argv = [
        './point',
        'makemigration',
        '--models-path',
        './db/models',
        '--migrations-path',
        './db/migrations',
        '--name',
        'automigration'
    ];
    const {Database} = require('./db/models');
    Database.init();

    require('sequelize-auto-migrations/bin/makemigration.js');
    // @ts-ignore
    return;
}

// ------------------ Compile Contracts ------------ //

if (program.compile) {
    log.info('Compiling contracts...');

    const buildDirPath = path.resolve(__dirname, '..', 'truffle', 'build', 'contracts');
    if (!existsSync(buildDirPath)) {
        mkdirSync(buildDirPath);
    }

    const contractPath = path.resolve(__dirname, '..', 'truffle', 'contracts');
    const contracts = ['Identity', 'Migrations', 'StorageProviderRegistry'];

    Promise.all(contracts.map(name => compileContract({name, contractPath, buildDirPath})
        .then(compiled => log.debug(compiled
            ? `Contract ${name} successfully compiled`
            : `Contract ${name} is already compiled`
        ))
    ))
        .then(() => ctx.exit(0))
        .catch(ctx.die);

    // @ts-ignore
    return;
}

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
    log.error(err, 'Error: uncaught exception');
});

process.on('unhandledRejection', (err: Error) => {
    log.error(err, 'Error: unhandled rejection');
});

// ------------------- Start Point ------------------- //

// This is just a dummy file: proper-lockfile handles the lockfile creation,
// but it's intended to lock some existing file
const lockfilePath = path.join(resolveHome(config.get('datadir')), 'point');

(async () => {
    await initFolders();
    try {
        if (!existsSync(lockfilePath)) {
            await promises.writeFile(lockfilePath, 'point');
        }
        await lockfile.lock(lockfilePath);
    } catch (err) {
        log.fatal(err, 'Failed to create lockfile, is point already running?');
        ctx.exit(1);
    }

    try {
        await migrate();
    } catch (err) {
        log.fatal(err, 'Failed to run database migrations');
        ctx.exit(1);
    }
    try {
        log.info({env: config.util.getEnv('NODE_ENV')}, 'Starting Point Node');
        const point = new Point(ctx);
        await point.start();
    } catch (err) {
        log.fatal(err, 'Failed to start Point Node');
        ctx.exit(1);
    }
})();
