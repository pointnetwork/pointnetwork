const {createWriteStream} = require('fs');
const os = require('os');
const path = require('path');
const pino = require('pino');
const UdpTransport = require('pino-udp');
const {multistream} = require('pino-multi-stream');
const ecsFormat = require('@elastic/ecs-pino-format');
const config = require('config');
// TODO: for some reason just ../util doesn't work
const {resolveHome} = require('../util/resolveHome');
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
let logger;

try {
    [identifier, isNewIdentifier] = getIdentifier();
} catch (e) {
    // TODO: if we get here, the logger is not defined and we get another breaking error
    // eslint-disable-next-line no-console
    console.error('Couldn\'t get network address for logging');
}

const tags = {
    identifier,
    account,
    process: 'point-engine',
    processVersion: process.env.POINT_ENGINE_VERSION
};

if (sendLogs && sendLogsTo) {
    const [address, port] = sendLogsTo.split('://').pop().split(':');
    const udpTransport = new UdpTransport({address, port});
    udpTransport.on('error', e => {
        logger.warn(
            {error: e, address, port},
            `Log stash is unavailable, will continue with local logging`
        );
    });
    streams.push(udpTransport);
    sendMetric = function (obj)  {
        let originalChilds;
        try {
            const chindings = `{${this?.[pino.symbols.chindingsSym]?.slice(1) || ''}}`;
            originalChilds = JSON.parse(chindings);
        } catch  {
            // do nothing
        }
        udpTransport
            .write(Buffer.from(JSON.stringify({...(originalChilds || tags), ...obj})), noop);
    };
    sendMetric({isNewIdentifier});
}

streams.push({
    level: options.level,
    stream: pino({prettyPrint: {colorize: true}})[pino.symbols.streamSym]
}, {
    level: options.level,
    stream: createWriteStream(path.resolve(path.join(resolveHome(datadir), 'point.log')))
});

logger = pino(options, multistream(streams));
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

logger.info(`platform: ${os.platform()}, version: ${os.version()} arch: ${os.arch()}, release: ${os.release()},
  totalMem: ${os.totalmem()}, freeMem: ${os.freemem()}`);
