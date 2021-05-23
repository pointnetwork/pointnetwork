const assert = require('assert');
const secp256k1 = require('secp256k1');
const utils = require('@pointnetwork/kadence/lib/utils');
const bsonrpc = require('./bson-rpc');
const BSON = require('./good-bson');
const { Transform } = require('stream');
const ethUtil = require('ethereumjs-util');

/**
 * Modified Spartacus plugin
 */
class AuthenticatePlugin {
    /**
     * Creates the plugin instance
     */
    constructor(node, ctx, publicKey, privateKey, options = {}) {
        this.ctx = ctx;

        this.privateKey = privateKey;
        if (! this.privateKey) throw new Error('privateKey is not set or not passed for authenticate plugin');
        this.publicKey = publicKey;
        if (! this.publicKey) throw new Error('publicKey is not set or not passed for authenticate plugin');

        this._validatedContacts = new Map();
        this._pendingValidators = new Map();
        this.identity = utils.toPublicKeyHash(this.publicKey);

        // todo: versioning:
        this.chainId = 7654111; // for internal signatures, we just need it to not coincide with known networks: https://ethereum.stackexchange.com/questions/17051/how-to-select-a-network-id-or-is-there-a-list-of-network-ids

        node.identity = node.router.identity = this.identity;

        node.rpc.serializer.append(() => new Transform({
            transform: this.serialize.bind(this),
            objectMode: true
        }));
        node.rpc.deserializer.prepend(() => new Transform({
            transform: this.deserialize.bind(this),
            objectMode: true
        }));
        node.use((req, res, next) => this.validate(node, req, res, next));
        this.setValidationPeriod();
    }

    /**
     * Sets the validation period for nodes
     * @param {number} period - Milliseconds to honor a proven contact response
     */
    setValidationPeriod(n = 10800000) {
        this._validationPeriod = n;
    }

    /**
     * Checks if the sender is addressable at the claimed contact information
     * and cross checks signatures between the original sender and the node
     * addressed. This is intended to prevent reflection attacks and general
     * DDoS via spam.
     * @param {KademliaNode} node
     * @param {AbstractNode~request} request
     * @param {AbstractNode~response} response
     * @param {AbstractNode~next} next
     */
    validate(node, req, res, next) {
        const period = this._validationPeriod;
        const record = this._validatedContacts.get(req.contact[0]);
        const validated = record && record.validated;
        const fresh = validated && ((Date.now() - record.timestamp) < period);

        if (this._pendingValidators.get(req.contact[0])) {
            return next(); // NB: Let's not get into an infinte validation loop
        }

        if (validated && fresh) {
            return next();
        }

        this._pendingValidators.set(req.contact[0], req.contact[1]);
        node.ping(req.contact, (err) => {
            this._pendingValidators.delete(req.contact[0]);

            if (err) {
                return this._validatedContacts.set(req.contact[0], {
                    validated: false,
                    timestamp: Date.now()
                });
            }

            this._validatedContacts.set(req.contact[0], {
                validated: true,
                timestamp: Date.now()
            });
            next();
        });
    }

    /**
     * Processes with bsonrpcSerializer then signs the result and appends an
     * additional payload containing signature+identity information
     * @implements {Messenger~serializer}
     */
    // todo: check if everytning is okay security wise here, signing arbitrary stuff could be dangerous
    serialize(data, encoding, callback) {
        let [id, buffer, target] = data;
        let parsed = bsonrpc.parse(buffer);
        if (!Array.isArray(parsed)) parsed = [ parsed ]; // todo: investigate
        let payload = parsed.map((obj) => {
            return obj.payload;
        });
        let vrs = ethUtil.ecsign(
            // todo: why not use keccak256 instead for full compatibility?
            utils._sha256(buffer),
            this.privateKey,
            this.chainId
        );
        let authenticate = bsonrpc.notification('AUTHENTICATE', [ this.ctx.utils.serializeSignature(vrs), this.publicKey.toString('hex') ]);

        payload.push(authenticate);
        callback(null, [
            id,
            BSON.serialize(payload),
            target
        ]);
    }

    /**
     * Parses and verifies the signature payload, then passes through to the
     * bsonrpcDeserializer if successful
     * @implements {Messenger~deserializer}
     */
    deserialize(buffer, encoding, callback) {
        /* eslint max-statements: [2, 30] */
        /* eslint complexity: [2, 12] */
        let payload = bsonrpc.parse(buffer);

        try {
            payload = payload.map(obj => {
                assert(obj.type !== 'invalid');
                return obj.payload;
            });
        } catch (err) {
            return callback(new Error('Failed to parse received payload'));
        }

        let [, identify] = payload;
        let authenticate = payload.filter(m => m.method === 'AUTHENTICATE').pop();

        if (typeof authenticate === 'undefined') {
            return callback(new Error('Missing authentication payload in message'));
        }

        let identity = Buffer.from(identify.params[0], 'hex');
        let [signature, publicKey] = authenticate.params;

        const {v,r,s} = this.ctx.utils.deserializeSignature(signature);

        let signedPayload = [];

        for (let i = 0; i < payload.length; i++) {
            if (payload[i].method === 'AUTHENTICATE') {
                break;
            } else {
                signedPayload.push(payload[i]);
            }
        }

        signedPayload = utils._sha256(
            BSON.serialize(signedPayload)
        );

        let publicKeyHash = utils.toPublicKeyHash(Buffer.from(publicKey, 'hex'));

        if (publicKeyHash.compare(identity) !== 0) {
            return callback(new Error('Identity does not match public key'));
        }

        try {
            var pubkeyRecovered = ethUtil.ecrecover(signedPayload, v, r, s, this.chainId);
            if (pubkeyRecovered.toString('hex') !== publicKey || pubkeyRecovered.length !== 64) {
                throw new Error('recovered public key does not match provided one');
            }
        } catch (err) {
            return callback(new Error('Message includes invalid signature, error message: '+err)); // todo: delete error message, don't send it to the node
        }

        callback(null, buffer);
    }

}

/**
 * Registers the plugin with a node
 */
module.exports = function(ctx, publicKey, privateKey, options) {
    return function(node) {
        return new AuthenticatePlugin(node, ctx, publicKey, privateKey, options);
    };
};

module.exports.AuthenticatePlugin = AuthenticatePlugin;