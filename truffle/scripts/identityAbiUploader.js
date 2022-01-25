const path = require('path');
const {homedir} = require('os');
const {existsSync} = require('fs');
const {merge} = require('lodash');
const pino = require('pino');
const Database = require('../../db');
const runMigrations = require('../../scripts/migrate');
const {updateConfig, profile} = require('../../scripts/patch-config');

const cwd = process.cwd();
const datadir = process.env.DATADIR || path.resolve(homedir(), '.point');
const configPath = path.resolve(datadir, 'config.json');
const configSource = existsSync(configPath) ? require(configPath) : {};
const defaultConfig = require(path.resolve(cwd, 'resources', 'defaultConfig.json'));
const dbConfig = require(path.resolve(cwd, 'resources', 'sequelizeConfig.json'));
const dbEnv = process.env.DB_ENV || 'development';
const contractBuildPath = path.resolve(cwd, 'truffle', 'build', 'contracts', 'Identity.json');
const log = pino({enabled: false});

dbConfig[dbEnv].host = 'localhost';
process.env.BLOCKCHAIN_URL = 'http://ynet.point.space:44444';

process.on('unhandledRejection', (err) => {
    console.error(err, "Error: unhandled rejection");
    console.error(err.stack);
});

(async () => {
    try {
        await runMigrations(dbConfig[dbEnv]);

        const config = merge(defaultConfig, {db: dbConfig[dbEnv]}, configSource, await updateConfig(datadir));
        const ctx = {config, datadir, log};

        ctx.db = new Database(ctx);
        ctx.db.init();

        const Point = require('../../core');
        const point = new Point(ctx);

        await point.start();

        if (!existsSync(contractBuildPath)) {
            throw new Error('Identity build is not found, please build the contract firts');
        }

        const {storage} = ctx.client;

        let file;
        await profile(async () => {
            file = await storage.putFile(String(contractBuildPath));
        }, 'Contract build upload');

        console.log(file.toJSON());

        let build;
        await profile(async () => {
            build = await storage.getFile(file.id);
        }, 'ABI download');

        console.info(build.toJSON());

        await ctx.db.shutdown();
    } catch (e) {
        console.error('Uploader error');
        console.error(e);
    }
})();
