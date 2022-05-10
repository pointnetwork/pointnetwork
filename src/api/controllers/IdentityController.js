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
        if (/^free/g.test(identity)) {
            return {eligibility: 'free'};
        }
        if (/^tweet/g.test(identity)) {
            return {eligibility: 'tweet'};
        }
        if (/^taken/g.test(identity)) {
            return {eligibility: 'taken', reason: 'taken reason'};
        }
        if (/^unavailable/g.test(identity)) {
            return {eligibility: 'unavailable', reason: 'unavailable reason'};
        }
        return {eligibility: 'taken', reason: 'taken reason'};
    },

    async regiterFreeIdentity(identity, address) {
        // call to ORACLEDOMAIN/activate_free?handle=[handle]&address=[address]
        log.info(`calling to {ORACLEDOMAIN}/activate_free?handle=${identity}&address=${address}`);
        if (/error$/g.test(identity)) {
            return {success: false, reason: 'free validation error reason'};
        }
        return {success: true, v: 'v', r: 'r', s: 's'};
    },

    async confirmTwitterValidation(identity, address, url) {
        // call to ${ORACLEDOMAIN}/api/activate_tweet?handle=[handle]&address=[address]&url=[url]
        log.info(
            `calling to {ORACLEDOMAIN}/api/activate_tweet?handle=${identity}&address=${address}&url=${url}`
        );
        if (/error$/g.test(identity)) {
            return {success: false, reason: 'twitter confirmation validation error'};
        }
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

    async isIdentityEligible() {
        const {identity} = this.req.params;
        const {eligibility, reason} = await TwitterOracle.isIdentityEligible(identity);
        return this._response({eligibility, reason});
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

            /*
            TODO: UNCOMMENT THIS CALL
            await blockchain.registerIdentity(
                identity,
                owner,
                Buffer.from(publicKey, 'hex'),
                v,
                r,
                s
            );
            */

            log.info(v, r, s);

            log.info(
                {identity, owner, publicKey: publicKey.toString('hex')},
                'Successfully registered new identity'
            );
            log.sendMetric({identity, owner, publicKey: publicKey.toString('hex')});

            return this._response({success: true});
        }

        // verify that the identity was validated on twitter
        if (code && url) {
            const {success, reason, v, r, s} = await TwitterOracle.confirmTwitterValidation(
                identity,
                owner,
                url
            );

            if (!success) {
                return this._response({success, reason});
            }

            return await register(v, r, s);
        }

        const {eligibility, reason} = await TwitterOracle.isIdentityEligible(identity);

        if (eligibility === 'free') {
            const {success, reason, v, r, s} = await TwitterOracle.regiterFreeIdentity(
                identity,
                owner
            );
            if (!success) {
                return this._response({success, reason});
            }
            return await register(v, r, s);
        }

        if (eligibility === 'tweet') {
            const code = `0x${crypto
                .createHash('sha256')
                .update(owner)
                .digest('hex')
                .toLowerCase()}`;
            return this._response({code});
        }

        return this._response({eligibility, reason});
    }
}

module.exports = IdentityController;
