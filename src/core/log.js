const {createWriteStream} = require('fs');
const os = require('os');
const path = require('path');
const pino = require('pino');
const {multistream} = require('pino-multi-stream');
const ecsFormat = require('@elastic/ecs-pino-format');
const config = require('config');
// TODO: for some reason just ../util doesn't work
const {resolveHome} = require('../util/resolveHome');
const datadir = config.get('datadir');
const {level, enabled} = config.get('log');
const options = {enabled, formatters: ecsFormat(), level: pino.levels.values[level]};
const streams = [];

streams.push({
    level: options.level,
    stream: pino({prettyPrint: {colorize: true}})[pino.symbols.streamSym]
}, {
    level: options.level,
    stream: createWriteStream(path.resolve(path.join(resolveHome(datadir), 'point.log')), {flags: 'a'})
});

const logger = pino(options, multistream(streams));
// logger = logger.child(tags);

const close = () => {
    for (const {stream} of streams) {
        if (stream && typeof stream.close === 'function') {
            stream.close();
        }
    }
};

module.exports = Object.assign(logger, {close});

logger.info(`platform: ${os.platform()}, version: ${os.version()} arch: ${os.arch()}, release: ${os.release()},
  totalMem: ${os.totalmem()}, freeMem: ${os.freemem()}`);
