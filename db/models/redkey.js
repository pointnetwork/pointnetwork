const Model = require('../model');
const _ = require('lodash');
const crypto = require('crypto');
const knex = require('../knex');

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

    static async generateNewForProvider(provider, keyIndex) {
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
                key.index = keyIndex;
                key.id = 'redkey' + key.provider_id.replace(/[\:\/#]/g, '-') + '_' + key.index;
                await key.save();

                resolve(key);
            });
        });
    }

    static async allByProvider(provider) {
        return await this.allBy('provider_id', provider.id);
    };

    async save() {
        const {id: _, ...data} = this.toJSON();

        if (typeof data.provider_id === 'string' && data.provider_id.includes('#')) {
            const address = ('0x' + data.provider_id.split('#').pop()).slice(-42);
            const connection = data.provider_id;
            const [{id} = {}] = await knex('providers').select('id').where({address, connection});

            if (!id) {
                throw new Error(`Unable to find provider by id: "${provider_id}"`);
            }

            data.provider_id = id;
        }

        if (isFinite(this._id)) {
            data.id = this._id;
        }

        const [redKey] = await knex('redkeys')
            .insert(data)
            .onConflict('id')
            .merge()
            .returning('*');

        this._id = redKey.id;

        // legacy persist to LevelDB
        super.save();
    }
}

Redkey.tableName = 'redkey';

module.exports = Redkey;
