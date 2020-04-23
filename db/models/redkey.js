const Model = require('../model');
const _ = require('lodash');
const crypto = require('crypto');

const defaultConfig = require('../../resources/defaultConfig.json');
const BITS = defaultConfig.storage.redkey_encryption_bits; // todo: make it read from the actual config, not default
const PUBEXP = defaultConfig.storage.redkey_public_exponent; // todo: make it read from the actual config, not default

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
                // publicExponent: PUBEXP, // todo: supposedly 3 makes it faster for decryption than encryption
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
}

module.exports = Redkey;