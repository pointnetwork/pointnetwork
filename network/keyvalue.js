class KeyValue {
    constructor(ctx, network) {
        this.ctx = ctx;
        this.network = network;
        this.data = {};
    }

    async start() {

    }

    update(domain, key, value) {
        console.log('KeyValue locally updated:', key, '=', value);
        this.data[ domain + '/' + key ] = value;
    }

    async get(domain, key, recursive = true, alwaysUpdate = false) {
        console.log('getting keyvalue', domain+'/'+key);
        if (domain+'/'+key in this.data && ! alwaysUpdate) {
            return this.data[ domain+'/'+key ];
        } else if (recursive) {
            let result = await this.ask(domain, key);
            console.log('ask for key '+key+' returned ',result);
            if (result) {
                this.data[domain+'/'+key] = result;
                return result;
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    async ask(domain, key) {
        console.log('asking keyvalue', domain+'/'+key);
        const result = await this.ctx.network.web3bridge.getKeyValue(domain, key);
        console.log('result:', result);
        return result;
    }

    async list(domain, key) {
        let list = [];
        let i = 0;
        while(true) {
            let fullKey = key + i++;
            let value = await this.get(domain, fullKey);
            if (value) {
                list.push(value);
            } else {
                return list;
            }
        }
    }

    async propagate(domain, key, value) {
        console.log('propagating keyvalue', domain+'/'+key, '=', value);
        await this.update(domain, key, value);
        return await this.ctx.network.web3bridge.putKeyValue(domain, key, value);
    }
}

module.exports = KeyValue;