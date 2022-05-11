const PointSDKController = require('./PointSDKController');
const blockchain = require('../../network/blockchain');
const {getNetworkPublicKey, getNetworkAddress} = require('../../wallet/keystore');
const logger = require('../../core/log');
const log = logger.child({Module: 'IdentityController'});
const crypto = require('crypto');
const axios = require('axios');
const ethers = require('ethers');
const getReferralCode = require('../../util/getReferralCode.ts');

const EMPTY_REFERRAL_CODE = '000000000000';

async function registerBountyReferral(address, type) {
    const referralCode = await getReferralCode();

    let event = 'free_reg';
    if (type === 'tweet') {
        event = 'twitter_reg';
    }

    const url = `https://bounty.pointnetwork.io/ref_success?event=${event}&ref=${referralCode ||
        EMPTY_REFERRAL_CODE}&addr=${address}`;

    return await axios.get(url);
}

const twitterOracleDomain = 'https://twitter-oracle.herokuapp.com';

const TwitterOracle = {
    async isIdentityEligible(identity) {
        const url = `${twitterOracleDomain}/api/eligible?handle=${identity}`;
        log.info(`calling to ${url}`);
        const {data} = await axios.get(url);
        return data;
    },

    async regiterFreeIdentity(identity, address) {
        const url = `${twitterOracleDomain}/api/activate_free?handle=${identity}&address=${address}`;
        log.info(`calling to ${url}`);
        const {data} = await axios.post(url);
        return data;
    },

    async confirmTwitterValidation(identity, address, url) {
        const oracleUrl = `${twitterOracleDomain}/api/activate_tweet?handle=${identity}&address=${address}&url=${url}`;
        log.info(`calling to ${oracleUrl}`);
        const {data} = await axios.post(oracleUrl);
        return data;
    }
};

function getIdentityValidationCode(owner) {
    const code = crypto
        .createHash('sha256')
        .update(owner)
        .digest('hex')
        .toLowerCase();
    return code;
}

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
        let code;
        if (eligibility === 'tweet') {
            const owner = getNetworkAddress();
            code = getIdentityValidationCode(owner);
        }
        return this._response({eligibility, reason, code});
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

        async function register(type, signData) {
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

            const hashedMessage = ethers.utils.keccak256(
                ethers.utils.toUtf8Bytes(`${identity}|${owner}|${type}`)
            );

            await blockchain.registerVerified(
                identity,
                owner,
                Buffer.from(publicKey, 'hex'),
                hashedMessage,
                signData
            );

            //log.info(v, r, s);

            log.info(
                {identity, owner, publicKey: publicKey.toString('hex')},
                'Successfully registered new identity'
            );

            log.sendMetric({identity, owner, publicKey: publicKey.toString('hex')});

            try {
                await registerBountyReferral(owner, type);
            } catch (error) {
                log.error(error);
            }
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

            try {
                await register('tweet', {v, r, s});
                return this._response({success: true});
            } catch (error) {
                log.error(error);
                return this._response({success: false});
            }
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

            try {
                await register('free', {v, r, s});
                return this._response({success: true});
            } catch (error) {
                log.error(error);
                return this._response({success: false});
            }
        }

        if (eligibility === 'tweet') {
            const code = getIdentityValidationCode(owner);
            return this._response({code});
        }

        return this._response({eligibility, reason});
    }
}

module.exports = IdentityController;
