import {Logger} from 'pino';

export function getLogger(module = 'point'): Logger {
    const logger = require('../core/log');
    return logger.child({module});
}
