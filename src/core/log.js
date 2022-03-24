const {createWriteStream} = require('fs');
const path = require('path');
const pino = require('pino');
const UdpTransport = require('pino-udp');
const {multistream} = require('pino-multi-stream');
const ecsFormat = require('@elastic/ecs-pino-format');
const config = require('config');
const {resolveHome} = require('../core/utils');
const {getIdentifier} = require('../util/getIdentifier');
const {getNetworkAddress} = require('../wallet/keystore');
const account = getNetworkAddress().toLowerCase();
const datadir = config.get('datadir');
const {level, enabled, sendLogs, sendLogsTo} = config.get('log');
const options = {enabled, formatters: ecsFormat(), level: pino.levels.values[level]};
const streams = [];
const noop = () => {};
let sendMetric = noop;
let identifier;
let isNewIdentifier;

try {
    [identifier, isNewIdentifier] = getIdentifier();
} catch (e) {
    logger.error('Couldn\'t get network address for logging');
}

const tags = {
    identifier,
    account
};

if (sendLogs && sendLogsTo) {
    const [address, port] = sendLogsTo.split('://').pop().split(':');
    const udpTransport = new UdpTransport({address, port});
    streams.push(udpTransport);
    sendMetric = function (obj)  {
        const chindings = `{${this[pino.symbols.chindingsSym]?.slice(1) || ''}}`;
        let originalChilds;
        try {
            originalChilds = JSON.parse(chindings);
        } catch  {
            // do nothing
        }
        udpTransport
            .write(Buffer.from(JSON.stringify({...(originalChilds || tags), ...obj})), noop);
    };
    sendMetric({isNewIdentifier});
}

streams.push(
    {
        level: options.level,
        stream: pino({prettyPrint: {colorize: true}})[pino.symbols.streamSym]
    },
    {level: options.level, stream: createWriteStream(path.resolve(path.join(resolveHome(datadir), 'point.log')))}
);

let logger = pino(options, multistream(streams));
logger = logger.child(tags);

const close = () => {
    for (const {stream} of streams) {
        if (stream && typeof stream.close === 'function') {
            stream.close();
        }
    }
};

module.exports = Object.assign(logger, {
    close,
    sendMetric
});
