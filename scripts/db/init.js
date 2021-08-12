// const nodeid = 'test3' // change to the node db you want to initialize

const fs = require('fs');
const os = require("os");
const _ = require('lodash')
const pino = require('pino');
const utils = require('../../core/utils');
const ctx = {};
// const nodeConfigPath = `~/.point/${nodeid}/config.json`.replace("~", os.homedir)
const nodeConfigPath = '/data/config.json'
const defaultConfig = require('../../resources/defaultConfig.json')
const config = JSON.parse(fs.readFileSync(nodeConfigPath, 'utf-8'));

// ctx.datadir = ctx.datapath = `~/.point/${nodeid}/`.replace("~", os.homedir)
ctx.datadir = ctx.datapath = '/data'
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