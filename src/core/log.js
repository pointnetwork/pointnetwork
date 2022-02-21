const {createWriteStream} = require('fs');
const path = require('path');
const pino = require('pino');
const udpTransport = require('pino-udp');
const {multistream} = require('pino-multi-stream');
const ecsFormat = require('@elastic/ecs-pino-format');
const config = require('config');
const {resolveHome} = require('../core/utils');

const datadir = config.get('datadir');
const {level, enabled, sendLogs, sendLogsTo} = config.get('log');
const options = {enabled, formatters: ecsFormat(), level: pino.levels.values[level]};
const streams = [];

if (sendLogs && sendLogsTo) {
    const [address, port] = sendLogsTo.split('://').pop().split(':');
    streams.push(new udpTransport({address, port}));
}

streams.push(
    {level: options.level, stream: pino({prettyPrint: {colorize: true}})[pino.symbols.streamSym]},
    {level: options.level, stream: createWriteStream(path.resolve(path.join(resolveHome(datadir), 'point.log')))}
);

module.exports = Object.assign(pino(options, multistream(streams)), {
    close() {
        for (const {stream} in streams) {
            if (stream && typeof stream.close === 'function') {
                stream.close();
            }
        }
    }
});
