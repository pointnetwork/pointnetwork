/* eslint-disable @typescript-eslint/ban-ts-comment */
import path from 'path';
import fs from 'fs';
import lockfile from 'proper-lockfile';
import {Command} from 'commander';
const disclaimer = require('./disclaimer.js');
const {getContractAddress, compileAndSaveContract} = require('./util/contract');

export const RUNNING_PKG_MODE = Boolean((process as typeof process & {pkg?: unknown}).pkg);

if (RUNNING_PKG_MODE) {
    // when running inside the packaged version the configuration should be
    // retrieved from the internal packaged config
    // by default config library uses process.cwd() to reference the config folder
    // when using vercel/pkg process.cwd references real folder and not packaged folder
    // overwriting this env variable fixes the problems
    process.env.NODE_CONFIG_DIR = path.resolve(__dirname, '..', 'config');
    // also, when running packaged app, production config will be loaded if
    // another one is not specified explicitly
    if (process.env.NODE_ENV === undefined && process.env.NODE_CONFIG_ENV === undefined) {
        process.env.NODE_CONFIG_ENV = 'production';
    }
}

process.env.HARDHAT_CONFIG = path.resolve(__dirname, '..', 'hardhat', 'hardhat.config.js');

disclaimer.output();

// Disable https://nextjs.org/telemetry
process.env['NEXT_TELEMETRY_DISABLED'] = '1';

const program: ProgramType<typeof Command> = new Command();

// TODO: Enabled this option for backward-compatibility support, but remove later to support newer syntax
program.storeOptionsAsProperties();

const app = require('../package.json');

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
    .command('hashfn [path]')
    .description('calculates hash of a file')
    .action((path) => void (program.hashfn = path));
program
    .command('tinker')
    .description('activates dev js command line mode')
    .action(() => void (program.tinker = true));
program
    .command('deploy')
    .description('deploy a website')
    .argument('[path]', '(optional) path to the website; if empty, tries the current working directory', null)
    .option('--contracts', '(re)deploy contracts too', false)
    .option('--dev', 'deploy zapp to dev too', false)
    .option(
        '--force-deploy-proxy',
        'Force the replacement of the proxy on upgradable contracts',
        false
    )
    .action((path, cmd) => {
        program.deploy = true;
        program.deploy_path = path;
        program.deploy_contracts = Boolean(cmd.contracts);
        program.dev = Boolean(cmd.dev);
        program.force_deploy_proxy = Boolean(cmd.forceDeployProxy);
    });
program
    .command('new <website>')
    .description('init a new Point website')
    .action((website/*, cmd*/) => {
        program.new = website;
    });
program
    .command('upload <path>')
    .description('uploads a file or directory')
    .action(path => {
        program.upload = path;
    });

program.parse(process.argv);

import logger from './core/log';
// import config from "config";

(async() => {
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

    // ----------------- Simple Commands ---------------- //
    if (program.hashfn) {
        const {hashFn} = require('./util/index');

        const path = program.hashfn;
        if (!fs.existsSync(path)) throw new Error('File not found: ' + path);

        // read file
        const buf = fs.readFileSync(path, null);

        // hash
        const hash = hashFn(buf).toString('hex');

        // print
        log.info(hash);
        return;
    }

    if (program.tinker) {
        const repl = require('repl');
        repl.start({prompt: '>> '});
    }

    // ----------------------- New ------------------------ //

    if (program.new) {
        const create = require('./core/new');
        create({website: program.new})
            .then(() => process.exit())
            .catch((e: Error) => { log.error('Error: ' + e.message); process.exit(); });

        return;
    }

    // --------------------- Config --------------------- //
    const config = require('config');

    // -------------------- Deployer --------------------- //

    if (program.deploy) {
        const deploy = require('./core/deploy');
        deploy({
            deploy_path: program.deploy_path,
            deploy_contracts: program.deploy_contracts,
            dev: program.dev,
            force_deploy_proxy: program.force_deploy_proxy
        })
            .then(exit)
            .catch(die);

        return;
    }

    // --------------------- Start -------------------- //

    const startPoint = require('./core/index').default;
    const migrate = require('./util/migrate').default;
    const initFolders = require('./initFolders').default;
    const {statAsync, resolveHome} = require('./util/index');

    // ----------------- Console Mode -------------------- //

    if (program.attach) {
        const Console = require('./console');
        const console = new Console();
        console.start();

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

        return;
    }

    if (program.migrate) {
        log.info('Starting migration...');
        await migrate();
        log.info('Migration ended.');
        return;
    }

    // -------------------- Uploader --------------------- //

    if (program.upload) {
        const {uploadData, uploadDir} = require('./client/storage');
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
                const file = await fs.promises.readFile(filePath);
                return uploadData(file);
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

        return;
    }

    // ------------------ Compile Contracts ------------ //

    if (program.compile) {
        log.info('Compiling contracts...');

        const buildDirPath = path.resolve(__dirname, '..', 'hardhat', 'build');
        if (!fs.existsSync(buildDirPath)) {
            fs.mkdirSync(buildDirPath);
        }

        const contractPath = path.resolve(__dirname, '..', 'hardhat', 'contracts');
        const contracts = ['Identity'];

        Promise.all(
            contracts.map(name =>
                compileAndSaveContract({name, contractPath, buildDirPath}).then((compiled: undefined|boolean) =>
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
        log.error({err, msg: err.message, name: err.name}, 'Error: unhandled rejection');
    });

    // ------------------- Start Point ------------------- //

    // This is just a dummy file: proper-lockfile handles the lockfile creation,
    // but it's intended to lock some existing file
    const lockfilePath = path.join(resolveHome(config.get('datadir')), 'point');

    try {
        await initFolders();
    } catch (err) {
        log.fatal(err);
        exit(11); // TODO: use `point-errors-code` once available.
    }

    try {
        if (!fs.existsSync(lockfilePath)) {
            await fs.promises.writeFile(lockfilePath, 'point');
        }
        await lockfile.lock(lockfilePath, {stale: 5000});
    } catch (err) {
        log.fatal(err, 'Failed to create lockfile, is point already running?');
        exit(12); // TODO: use `point-errors-code` once available.
    }

    try {
        log.info({env: config.util.getEnv('NODE_ENV')}, 'Calling migrate()');
        await migrate();
        log.info({env: config.util.getEnv('NODE_ENV')}, 'migrate() ended.');
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
