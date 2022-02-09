const fs = require('fs');
const os = require('os');
const _ = require('lodash');
const defaultConfig = require('../../../resources/defaultConfig.json');

const ctx = {};
const datadir = process.env.DATADIR
    ? process.env.DATADIR
    : `~/.point/test2/`.replace('~', os.homedir);
const nodeConfigPath = `${datadir}/config.json`;
ctx.datadir = ctx.datapath = datadir;

const config = JSON.parse(fs.readFileSync(nodeConfigPath, 'utf-8'));

ctx.configPath = nodeConfigPath;
ctx.basepath = __dirname;
ctx.config = _.merge(defaultConfig, config);

ctx.config.db.dialect = 'postgres';
ctx.config.db.database = process.env.DB_TEST;
ctx.config.db.username = process.env.DB_USERNAME;
ctx.config.db.password = process.env.DB_PASSWORD;
ctx.config.db.host = process.env.DB_HOST;

ctx.log = {debug: jest.fn()};

module.exports = ctx;
