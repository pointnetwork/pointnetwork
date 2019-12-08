const Model = require('../model');
const _ = require('lodash');
const crypto = require('crypto');

const defaultConfig = require('../../resources/defaultConfig.json');
const BITS = defaultConfig.storage.redkey_encryption_bits;
const STUPID_PADDING = defaultConfig.storage.redkey_stupid_padding;

class Redkey extends Model {
    constructor(...args) {
        super(...args);
    }

    static _buildIndices() {
        this._addIndex('provider_id');
    }

    setProvider(provider) {
        this._attributes.provider_id = provider.id;
    }
    async getProvider() {
        return await this.ctx.db.provider.find(this._attributes.provider_id);
    }

    // todo: store keys internally in binary format, not text

    static async generateNewForProvider(provider) {
        return new Promise((resolve, reject) => {
            crypto.generateKeyPair('rsa', {
                modulusLength: BITS,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem',
                    // cipher: 'aes-256-cbc',
                    // passphrase: 'top secret'
                }
            }, async(err, publicKey, privateKey) => {
                if (err) reject('Error: '+err);

                const key = await Redkey.new();
                key.pub = publicKey;
                key.priv = privateKey;
                key.provider = provider;
                key.index = 0;
                key.id = 'redkey' + key.provider_id + '_' + key.index;
                await key.save();

                resolve(key);
            });
        })
    }

    static async allByProvider(provider) {
        return await this.allBy('provider', provider);
    };

    static async decryptDataStatic(data, length, pubKey) {
        const readSize = BITS/8;
        const writeSize = readSize-STUPID_PADDING;

        let buffers = [];
        let c = 0;
        let previousReadBuffer = Buffer.alloc(readSize); // initial buffer for CBC mode
        while (true) {
            let readBuffer = data.slice(c * readSize, Math.min(c * readSize + readSize, data.length));

            let decrypted = crypto.publicDecrypt({key: pubKey, padding: crypto.constants.RSA_NO_PADDING}, readBuffer);

            // Turning ECB mode into CBC mode
            decrypted = this.ctx.utils.xorBuffersInPlace(decrypted, previousReadBuffer);

            // decrypted now has decrypted data starting at byte 1, and byte 0 should be zero // todo: validate that the first byte is 0?

            buffers.push(decrypted.slice(STUPID_PADDING));

            let bytesRead = readBuffer.length;
            if (bytesRead !== readSize) break;

            previousReadBuffer = readBuffer;

            c++;

            await this.ctx.utils.nullAsyncFn(); // todo: replace with just await null?
        }

        return Buffer.concat(buffers).slice(0, length);
    }
}

module.exports = Redkey;