const blockchain = require('./providers/ethereum');
import logger from '../core/log';
const log = logger.child({module: 'KeyValue'});

class KeyValue {
    constructor() {
        this.data = {};
    }

    update(identity, key, value) {
        log.debug('KeyValue locally updated:', key, '=', value);
        this.data[identity + '/' + key] = value;
    }

    async get(identity, key, recursive = true, alwaysUpdate = false) {
        log.debug('getting keyvalue', identity + '/' + key);
        if (identity + '/' + key in this.data && !alwaysUpdate) {
            return this.data[identity + '/' + key];
        } else if (recursive) {
            const result = await this.ask(identity, key);
            log.debug('ask for key ' + key + ' returned ', result);
            if (result) {
                this.data[identity + '/' + key] = result;
                return result;
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    async ask(identity, key) {
        log.debug('asking keyvalue', identity + '/' + key);
        const result = await blockchain.getKeyValue(identity, key);
        log.debug('result:', result);
        return result;
    }

    async list(identity, key) {
        const list = [];
        let i = 0;
        while (true) {
            const fullKey = key + i++;
            const value = await this.get(identity, fullKey);
            if (value) {
                list.push(value);
            } else {
                return list;
            }
        }
    }

    async propagate(identity, key, value, version) {
        log.debug(`propagating keyvalue: ${identity}/${key}=${value}, version ${version}`);
        await this.update(identity, key, value);
        return await blockchain.putKeyValue(identity, key, value, version);
    }
}

const keyValue = new KeyValue();

export default keyValue;
