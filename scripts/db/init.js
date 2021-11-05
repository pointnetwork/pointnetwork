const fs = require('fs');
const os = require("os");
const DB = require("../../db");
const _ = require('lodash');
const pino = require('pino');
const defaultConfig = require('../../resources/defaultConfig.json');

const ctx = {};
const datadir = process.env.DATADIR ? process.env.DATADIR : `~/.point/test2/`.replace("~", os.homedir);
const nodeConfigPath = `${datadir}/config.json`;
const sequelizeConfigPath = `/app/resources/sequelizeConfig.json`;
ctx.datadir = ctx.datapath = datadir;

const config = JSON.parse(fs.readFileSync(nodeConfigPath, 'utf-8'));
const sequelizeConfig = JSON.parse(fs.readFileSync(sequelizeConfigPath, 'utf-8'));

const ENVIRONMENT = 'production';

ctx.configPath = nodeConfigPath;
ctx.basepath = __dirname;
ctx.log = pino();
ctx.config = _.merge(defaultConfig, config);
ctx.exit = (code = 1) => { process.exit(code); };
ctx.die = (err) => { ctx.log.fatal(err); ctx.exit(1); };
ctx.config.db = sequelizeConfig[ENVIRONMENT];

process.on('uncaughtException', (err) => {
    ctx.log.error(err.message);
    ctx.log.debug(err.stack);
    console.error('Is the node still running? It must be stopped for this script to run!');
    process.exit(1);
});

// only init the database for the db console
const database = new DB(ctx);
database.init();