const nodeid = 'test2' // change to the node db you want to initialize

const fs = require('fs');
const os = require("os");
const _ = require('lodash')
const pino = require('pino');
const ctx = {};
const nodeConfigPath = `~/.point/${nodeid}/config.json`.replace("~", os.homedir)
const defaultConfig = require('../../resources/defaultConfig.json')
const config = JSON.parse(fs.readFileSync(nodeConfigPath, 'utf-8'));

ctx.datadir = ctx.datapath = `~/.point/${nodeid}/`.replace("~", os.homedir)
ctx.configPath = nodeConfigPath
ctx.basepath = __dirname;
ctx.log = pino()
ctx.config = _.merge(defaultConfig, config)

process.on('uncaughtException', (err) => {
  ctx.log.error(err.message);
  ctx.log.debug(err.stack);
  process.exit(1);
});

const Point = require('../../core');
point = new Point(ctx);

// only init the database for the db console
point.initDatabase()