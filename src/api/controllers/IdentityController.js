const PointSDKController = require('./PointSDKController');
const blockchain = require('../../network/blockchain');
const {getNetworkPublicKey, getNetworkAddress} = require('../../wallet/keystore');
const logger = require('../../core/log');
const log = logger.child({Module: 'IdentityController'});
const crypto = require('crypto');

const TwitterOracle = {
    async isIdentityEligible(identity) {
        log.info(`calling to {ORACLEDOMAIN}/api/eligible?handle=${identity}`);
        // call to ORACLEDOMAIN/api/eligible?handle=[handle]
        if (identity === 'free') {
            return {eligibility: 'free'};
        }
        if (identity === 'tweet') {
            return {eligibility: 'tweet'};
        }
        if (identity === 'taken') {
            return {eligibility: 'taken', reason: 'taken reason'};
        }
        if (identity === 'unavailable') {
            return {eligibility: 'unavailable', reason: 'unavailable reason'};
        }
        return true;
    },

    async regiterFreeIdentity(identity, address) {
        // call to ORACLEDOMAIN/activate_free?handle=[handle]&address=[address]
        log.info(`calling to {ORACLEDOMAIN}/activate_free?handle=${identity}&address=${address}`);
        return {success: true, v: 'v', r: 'r', s: 's'};
    },

    async confirmTwitterValidation(identity, address, url) {
        // call to ${ORACLEDOMAIN}/api/activate_tweet?handle=[handle]&address=[address]&url=[url]
        log.info(
            `calling to {ORACLEDOMAIN}/api/activate_tweet?handle=${identity}&address=${address}&url=${url}`
        );
        return {success: true, v: 'v', r: 'r', s: 's'};
    }
};

class IdentityController extends PointSDKController {
    constructor(ctx, req, rep) {
        super(ctx, req);
        this.req = req;
        this.rep = rep;
    }

    async isIdentityRegistered() {
        const identityRegistred = await blockchain.isCurrentIdentityRegistered();
        return this._response({identityRegistred: identityRegistred});
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

    async publicKeyByIdentity() {
        const identity = this.req.params.identity;
        const publicKey = await blockchain.commPublicKeyByIdentity(identity);
        return this._response({publicKey});
    }

    async blockTimestamp() {
        const blockNumber = this.req.body.blockNumber;
        const timestamp = await blockchain.getBlockTimestamp(blockNumber);
        return this._response({timestamp});
    }

    async registerIdentity() {
        const {identity, _csrf, code, url} = this.req.body;
        const {host} = this.req.headers;

        if (host !== 'point') {
            return this.rep.status(403).send('Forbidden');
        }
        if (_csrf !== this.ctx.csrf_tokens.point) {
            return this.rep.status(403).send('CSRF token invalid');
        }

        const publicKey = getNetworkPublicKey();
        const owner = getNetworkAddress();

        async function register(v, r, s) {
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

            await blockchain.registerIdentity(
                identity,
                owner,
                Buffer.from(publicKey, 'hex'),
                v,
                r,
                s
            );

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

        // verify that the identity was validated on twitter
        if (code && url) {
            const {success, reason, v, r, s} = await TwitterOracle.confirmTwitterValidation(
                identity,
                owner,
                url
            );

            if (!success) {
                return {
                    status: 500,
                    data: {error: reason}
                };
            }

            return await register(v, r, s);
        }

        const {elegibility, reason} = await TwitterOracle.isIdentityEligible(identity);

        if (elegibility === 'free') {
            const {v, r, s} = await TwitterOracle.regiterFreeIdentity(identity, owner);
            return await register(v, r, s);
        }

        if (elegibility === 'tweet') {
            const code = `0x${crypto
                .createHash('sha256')
                .update(owner)
                .digest('hex')
                .toLowerCase()}`;
            return {
                status: 200,
                data: {code}
            };
        }

        return {
            status: 500,
            data: {elegibility, reason}
        };
    }
}

module.exports = IdentityController;
