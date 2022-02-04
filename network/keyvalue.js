class KeyValue {
    constructor(ctx, network) {
        this.ctx = ctx;
        this.log = ctx.log.child({module: 'KeyValue'});
        this.network = network;
        this.data = {};
    }

    async start() {

    }

    update(identity, key, value) {
        this.log.debug('KeyValue locally updated:', key, '=', value);
        this.data[ identity + '/' + key ] = value;
    }

    async get(identity, key, recursive = true, alwaysUpdate = false) {
        this.log.debug('getting keyvalue', identity+'/'+key);
        if (identity+'/'+key in this.data && ! alwaysUpdate) {
            return this.data[ identity+'/'+key ];
        } else if (recursive) {
            let result = await this.ask(identity, key);
            this.log.debug('ask for key '+key+' returned ',result);
            if (result) {
                this.data[identity+'/'+key] = result;
                return result;
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    async ask(identity, key) {
        this.log.debug('asking keyvalue', identity+'/'+key);
        const result = await this.ctx.web3bridge.getKeyValue(identity, key);
        this.log.debug('result:', result);
        return result;
    }

    async list(identity, key) {
        let list = [];
        let i = 0;
        while(true) {
            let fullKey = key + i++;
            let value = await this.get(identity, fullKey);
            if (value) {
                list.push(value);
            } else {
                return list;
            }
        }
    }

    async propagate(identity, key, value) {
        this.log.debug('propagating keyvalue', identity+'/'+key, '=', value);
        await this.update(identity, key, value);
        return await this.ctx.web3bridge.putKeyValue(identity, key, value);
    }
}

module.exports = KeyValue;