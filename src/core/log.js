const {createWriteStream} = require('fs');
const path = require('path');
const pino = require('pino');
const udpTransport = require('pino-udp');
const {multistream} = require('pino-multi-stream');
const ecsFormat = require('@elastic/ecs-pino-format');
const config = require('config');
const {resolveHome} = require('../core/utils');
const {getNetworkAddress} = require('../wallet/keystore');
const datadir = config.get('datadir');
const {level, enabled, sendLogs, sendLogsTo} = config.get('log');
const options = {enabled, formatters: ecsFormat(), level: pino.levels.values[level]};
const streams = [];

if (sendLogs && sendLogsTo) {
    const [address, port] = sendLogsTo.split('://').pop().split(':');
    streams.push(new udpTransport({address, port}));
}

streams.push(
    {
        level: options.level,
        stream: pino({prettyPrint: {colorize: true}})[pino.symbols.streamSym]
    },
    {level: options.level, stream: createWriteStream(path.resolve(path.join(resolveHome(datadir), 'point.log')))}
);

let logger = pino(options, multistream(streams));

try {
    const account = getNetworkAddress().toLowerCase();
    logger = logger.child({account});
} catch (e) {
    logger.error('Couldn\'t get network address for logging');
}

module.exports = Object.assign(logger, {
    close() {
        for (const {stream} of streams) {
            if (stream && typeof stream.close === 'function') {
                stream.close();
            }
        }
    }
});
