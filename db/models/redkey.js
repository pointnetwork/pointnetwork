const Model = require('../model');
const crypto = require('crypto');
const Provider = require('./provider');
const Sequelize = require('sequelize');
const config = require('config');

const BITS = config.get('storage.redkey_encryption_bits');

class Redkey extends Model {
    constructor(...args) {
        super(...args);
    }

    // todo: store keys internally in binary format, not text

    static async generateNewForProvider() {
        return new Promise((resolve, reject) => {
            crypto.generateKeyPair(
                'rsa',
                {
                    modulusLength: BITS,
                    // publicExponent: PUBEXP, // todo: supposedly 3 makes it faster for decryption than encryption
                    publicKeyEncoding: {
                        type: 'spki',
                        format: 'pem'
                    },
                    privateKeyEncoding: {
                        type: 'pkcs8',
                        format: 'pem'
                        // cipher: 'aes-256-cbc',
                        // passphrase: 'top secret'
                    }
                },
                async (err, publicKey, privateKey) => {
                    if (err) reject(err);

                    resolve({
                        publicKey,
                        privateKey
                    });
                }
            );
        });
    }

    static async allByProvider(provider) {
        return await this.allBy('provider_id', provider.id);
    }
}

Redkey.init(
    {
        id: {type: Sequelize.DataTypes.BIGINT, unique: true, primaryKey: true, autoIncrement: true},
        // provider_id: { type: Sequelize.DataTypes.BIGINT, references: { model: 'Provider', key: 'id' } },
        index: {type: Sequelize.DataTypes.INTEGER},
        private_key: {type: Sequelize.DataTypes.TEXT},
        public_key: {type: Sequelize.DataTypes.TEXT}
    },
    {
        indexes: [
            {name: 'provider_id_index_unique', unique: true, fields: ['provider_id', 'index']}
        ]
    }
);

Redkey.belongsTo(Provider);

module.exports = Redkey;
