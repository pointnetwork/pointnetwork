const fs = require('fs');
const os = require("os");
const _ = require('lodash')
const pino = require('pino');
const utils = require('../../core/utils');
const defaultConfig = require('../../resources/defaultConfig.json')

const ctx = {};
const datadir = process.env.DATADIR ? process.env.DATADIR : `~/.point/test2/`.replace("~", os.homedir)
const nodeConfigPath = `${datadir}/config.json`
ctx.datadir = ctx.datapath = datadir

const config = JSON.parse(fs.readFileSync(nodeConfigPath, 'utf-8'));
ctx.configPath = nodeConfigPath
ctx.basepath = __dirname;
ctx.log = pino()
ctx.config = _.merge(defaultConfig, config)
ctx.utils = utils;
ctx.exit = (code = 1) => { process.exit(code); };
ctx.die = (err) => { ctx.log.fatal(err); ctx.exit(1); };

process.on('uncaughtException', (err) => {
  ctx.log.error(err.message);
  ctx.log.debug(err.stack);
  console.error('Is the node still running? It must be stopped for this script to run!')
  process.exit(1);
});

const Point = require('../../core');
point = new Point(ctx);

// only init the database for the db console
point.initDatabase()