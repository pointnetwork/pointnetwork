const PointSDKController = require('./PointSDKController');
const blockchain = require('../../network/blockchain');
const {getNetworkPublicKey, getNetworkAddress} = require('../../wallet/keystore');
const logger = require('../../core/log');
const log = logger.child({Module: 'IdentityController'});

class IdentityController extends PointSDKController {
    constructor(ctx, req, rep) {
        super(ctx);
        this.req = req;
        this.rep = rep;
    }

    async identityToOwner() {
        const identity = this.req.params.identity;
        const owner = await blockchain.ownerByIdentity(identity);
        return this._response({owner: owner});
    }

    async ownerToIdentity() {
        const owner = this.req.params.owner;
        const identity = await blockchain.identityByOwner(owner);
        return this._response({identity});
    }

    async registerIdentity() {
        const {identity, _csrf} = this.req.body;
        const {host} = this.req.headers;

        if (host !== 'point') {
            return this.rep.status(403).send('Forbidden');
        }
        if (_csrf !== this.ctx.csrf_tokens.point) {
            return this.rep.status(403).send('CSRF token invalid');
        }

        const publicKey = getNetworkPublicKey();
        const owner = getNetworkAddress();

        log.info(
            {
                identity,
                owner,
                publicKey,
                len: Buffer.byteLength(publicKey, 'utf-8'),
                parts: [`0x${publicKey.slice(0, 32)}`, `0x${publicKey.slice(32)}`]
            },
            'Registering a new identity'
        );

        await blockchain.registerIdentity(identity, owner, Buffer.from(publicKey, 'hex'));

        log.info(
            {identity, owner, publicKey: publicKey.toString('hex')},
            'Successfully registered new identity'
        );
        log.sendMetric({identity, owner, publicKey: publicKey.toString('hex')});

        return {
            status: 200,
            data: 'OK'
        };
    }
}

module.exports = IdentityController;
