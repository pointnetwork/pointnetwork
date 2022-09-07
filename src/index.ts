/* eslint-disable @typescript-eslint/ban-ts-comment */
import path from 'path';
import {existsSync, mkdirSync} from 'fs';
import {Command} from 'commander';
import {prepareEnv} from './init/prepareEnv';
import {patchConfig} from './init/patchConfig';
import disclaimer from './init/disclaimer';
import {getLogger} from './init/logger';
import {compileAndSaveContract} from './util/contract';
import {initProcessListeners} from './init/processListeners';

prepareEnv();
disclaimer.output();

const program: ProgramType<typeof Command> = new Command();

// TODO: Enabled this option for backward-compatibility support, but remove later to support newer syntax
program.storeOptionsAsProperties();

program.version(process.env.POINT_ENGINE_VERSION || 'No version is specified');

program.description(`
    Point Network
    https://pointnetwork.io/

    Licensed under MIT license.
`);

program.option('-d, --datadir <path>', 'path to the data directory');

// Patch config
patchConfig(program.datadir);

// Init logger
const log = getLogger();

// Helpers to terminate process
const exit = (code = 0) => {
    log.close({exitCode: code}, 'Closing logger');
    process.exit(code);
};
const die = (err: Error) => {
    log.fatal(err, err.message || 'Unknown error');
    exit(1);
};

// Setup process listeners to handle graceful shutdown
initProcessListeners(log);

// Define program commands
program
    .command('start', {isDefault: true})
    .description('start the node')
    .action(async () => {
        const initEngine = require('./init/initEngine');
        await initEngine.default().catch(exit);
    });
program
    .command('attach')
    .description('attach to the running point process')
    .action(() => {
        const Console = require('./console');
        const csl = new Console();
        csl.start();
    });
program
    .command('makemigration')
    .description('[dev mode] auto create db migrations from models')
    .action(() => {
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
    });
program
    .command('compile')
    .description('compile contracts')
    .action(async () => {
        log.info('Compiling contracts...');
        const buildDirPath = path.resolve(__dirname, '..', 'hardhat', 'build');
        if (!existsSync(buildDirPath)) {
            mkdirSync(buildDirPath);
        }

        const contractPath = path.resolve(__dirname, '..', 'hardhat', 'contracts');
        const contracts = ['Identity'];

        await Promise.all(
            contracts.map(name =>
                compileAndSaveContract({name, contractPath, buildDirPath}).then(compiled =>
                    log.debug(
                        compiled
                            ? `Contract ${name} successfully compiled`
                            : `Contract ${name} is already compiled`
                    )
                )
            )
        ).catch(die);

        exit();
    });
program
    .command('deploy')
    .description('deploy a website')
    .argument(
        '[path]',
        '(optional) path to the website; if empty, tries the current working directory',
        null
    )
    .option('--contracts', '(re)deploy contracts too', false)
    .option('--dev', 'deploy zapp to dev too', false)
    .option(
        '--force-deploy-proxy',
        'Force the replacement of the proxy on upgradable contracts',
        false
    )
    .action(async (path, cmd) => {
        const deploy = require('./core/deploy');
        await deploy({
            deploy_path: path,
            deploy_contracts: Boolean(cmd.contracts),
            dev: Boolean(cmd.dev),
            force_deploy_proxy: Boolean(cmd.forceDeployProxy)
        }).catch(die);
        exit();
    });
program
    .command('new <website>')
    .description('init a new Point website')
    .action(async website => {
        const create = require('./core/new');
        await create({website}).catch(die);
        exit();
    });
program
    .command('upload <path>')
    .description('uploads a file or directory')
    .action(async path => {
        const upload = require('./core/upload');
        const id = await upload.default(path).catch(die);
        log.info({id}, 'Upload finished successfully');
        exit();
    });

// program.option('-v, --verbose', 'force the logger to show debug level messages', false); // todo
// program.option('--shutdown', 'sends the shutdown signal to the daemon'); // todo
// program.option('--daemon', 'sends the daemon to the background'); // todo
// program.option('--rpc <method> [params]', 'send a command to the daemon'); // todo
program.parse(process.argv);
