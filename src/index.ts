/* eslint-disable @typescript-eslint/ban-ts-comment */
import path from 'path';
import {existsSync, mkdirSync, promises as fs} from 'fs';
import lockfile from 'proper-lockfile';
import {Command} from 'commander';
import disclaimer from './disclaimer';
import {getContractAddress, compileAndSaveContract} from './util/contract';

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

const app = require(path.resolve(__dirname, '..', 'package.json'));

process.env.POINT_ENGINE_VERSION = app.version;
program.version(app.version || 'No version is specified');
program.description(`
    Point Network
    https://pointnetwork.io/

    Licensed under MIT license.
`);

program.option('-d, --datadir <path>', 'path to the data directory');
program.option('-v, --verbose', 'force the logger to show debug level messages', false);

program.command('start', {isDefault: true}).description('start the node');
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
        program.force_deploy_proxy = Boolean(cmd.forceDeployProxy);
    })
    .option('--contracts', '(re)deploy contracts too', false)
    .option('--dev', 'deploy zapp to dev too', false)
    .option(
        '--force-deploy-proxy',
        'Force the replacement of the proxy on upgradable contracts',
        false
    );
program
    .command('upload <path>')
    .description('uploads a file or directory')
    .action(path => {
        program.upload = path;
    });

// program.option('--shutdown', 'sends the shutdown signal to the daemon'); // todo
// program.option('--daemon', 'sends the daemon to the background'); // todo
// program.option('--rpc <method> [params]', 'send a command to the daemon'); // todo
program.parse(process.argv);

// ------------------ Patch Config ------------ //

if (program.datadir) {
    process.env.DATADIR = program.datadir;
}

if (process.env.MODE === 'e2e' || process.env.MODE === 'zappdev') {
    const identityContractAddress = getContractAddress('Identity');

    if (!identityContractAddress) {
        throw new Error('Could not get Identity contract address');
    }
    process.env.IDENTITY_CONTRACT_ADDRESS = identityContractAddress;
}

// Warning: the below imports should take place after the above config patch!
process.env.HARDHAT_CONFIG = path.resolve(__dirname, '..', 'hardhat', 'hardhat.config.js');

import config from 'config';
import logger from './core/log';
import startPoint from './core/index';
import migrate from './util/migrate';
import initFolders from './initFolders';
import {statAsync, resolveHome} from './util';

// ------------------- Init Logger ----------------- //

const log = logger.child({module: 'point'});
const exit = (code: number) => {
    log.close();
    process.exit(code);
};
const die = (err: Error) => {
    log.fatal(err);
    exit(1);
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
    const deploy = require('./core/deploy');
    deploy({
        deploy_path: program.deploy,
        deploy_contracts: program.deploy_contracts,
        dev: program.dev,
        force_deploy_proxy: program.force_deploy_proxy
    })
        .then(exit)
        .catch(die);
    // @ts-ignore
    return;
}

// -------------------- Uploader --------------------- //

if (program.upload) {
    const {uploadFile, uploadDir} = require('./client/storage');
    const init = require('./client/storage/init');

    const main = async () => {
        await init.default();

        const filePath = path.isAbsolute(program.upload!)
            ? program.upload!
            : path.resolve(__dirname, '..', program.upload!);

        const stat = await statAsync(filePath);
        if (stat.isDirectory()) {
            return uploadDir(filePath);
        } else {
            const file = await fs.readFile(filePath);
            return uploadFile(file);
        }
    };

    main()
        .then(id => {
            log.info({id}, 'Upload finished successfully');
            process.exit(0);
        })
        .catch(e => {
            log.error('Upload failed');
            log.error(e);
            process.exit(1);
        });

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
        'dist/db/models',
        '--migrations-path',
        'migrations/database',
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

    const buildDirPath = path.resolve(__dirname, '..', 'hardhat', 'build');
    if (!existsSync(buildDirPath)) {
        mkdirSync(buildDirPath);
    }

    const contractPath = path.resolve(__dirname, '..', 'hardhat', 'contracts');
    const contracts = ['Identity'];

    Promise.all(
        contracts.map(name =>
            compileAndSaveContract({name, contractPath, buildDirPath}).then(compiled =>
                log.debug(
                    compiled
                        ? `Contract ${name} successfully compiled`
                        : `Contract ${name} is already compiled`
                )
            )
        )
    )
        .then(() => exit(0))
        .catch(die);

    // @ts-ignore
    return;
}

// ------------------ Gracefully exit ---------------- //

let exiting = false;
async function _exit(sig: typeof sigs[number]) {
    if (exiting) return;
    exiting = true;

    log.info('Received signal ' + sig + ', shutting down...');
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
sigs.forEach(function(sig) {
    process.on(sig, function() {
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
    try {
        await initFolders();
    } catch (err) {
        log.fatal(err);
        exit(11); // TODO: use `point-errors-code` once available.
    }

    try {
        if (!existsSync(lockfilePath)) {
            await fs.writeFile(lockfilePath, 'point');
        }
        await lockfile.lock(lockfilePath, {stale: 5000});
    } catch (err) {
        log.fatal(err, 'Failed to create lockfile, is point already running?');
        exit(12); // TODO: use `point-errors-code` once available.
    }

    try {
        await migrate();
    } catch (err) {
        log.fatal(err, 'Failed to run database migrations');
        exit(13); // TODO: use `point-errors-code` once available.
    }

    try {
        log.info({env: config.util.getEnv('NODE_ENV')}, 'Starting Point Node');
        await startPoint();
    } catch (err) {
        log.fatal(err, 'Failed to start Point Node');
        exit(1);
    }
})();
