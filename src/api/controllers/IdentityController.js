const PointSDKController = require('./PointSDKController');
const blockchain = require('../../network/providers/ethereum');
const solana = require('../../network/providers/solana');
const {getNetworkPublicKey, getNetworkAddress} = require('../../wallet/keystore');
const logger = require('../../core/log');
const log = logger.child({Module: 'IdentityController'});
const crypto = require('crypto');
const axios = require('axios');
const ethers = require('ethers');
const {getReferralCode, isChineseTimezone} = require('../../util');
const open = require('open');
const csrfTokens = require('../../client/zweb/renderer/csrfTokens');

const EMPTY_REFERRAL_CODE = '000000000000';

async function registerBountyReferral(address, type) {
    const referralCode = await getReferralCode();

    let event = 'free_reg';
    if (type === 'tweet' || type === 'taken') {
        event = 'twitter_reg';
    }

    const url = `https://bounty.pointnetwork.io/ref_success?event=${event}&ref=${referralCode ||
        EMPTY_REFERRAL_CODE}&addr=${address}`;

    return await axios.get(url);
}

const twitterOracleDomain = 'https://twitter-oracle.herokuapp.com';
const twitterOracleDomainFallback = 'https://twitter-oracle.point.space';
const twitterOracleUrl = isChineseTimezone() ? twitterOracleDomainFallback : twitterOracleDomain;

let TwitterOracle = {
    async isIdentityEligible(identity) {
        const url = `${twitterOracleUrl}/api/eligible?handle=${identity}`;
        log.info(`calling to ${url}`);
        const {data} = await axios.get(url);
        return data;
    },

    async regiterFreeIdentity(identity, address) {
        const url = `${twitterOracleUrl}/api/activate_free?handle=${identity}&address=${address}`;
        log.info(`calling to ${url}`);
        const {data} = await axios.post(url);
        return data;
    },

    async confirmTwitterValidation(identity, address, url) {
        const oracleUrl = `${twitterOracleUrl}/api/activate_tweet?handle=${identity}&address=${address}&url=${encodeURIComponent(
            url
        )}`;

        log.info(`calling to ${oracleUrl}`);
        const {data} = await axios.post(oracleUrl);
        return data;
    }
};

if (
    (process.env.MODE === 'e2e' || process.env.MODE === 'zappdev') &&
    !(process.env.USE_ORACLE === 'true')
) {
    TwitterOracle = {
        async isIdentityEligible(identity) {
            log.info({identity}, 'isIdentityEligible mock called');
            if (/^tweet/g.test(identity)) {
                return {eligibility: 'tweet'};
            }
            if (/^taken/g.test(identity)) {
                return {eligibility: 'taken', reason: 'taken reason'};
            }
            if (/^unavailable/g.test(identity)) {
                return {eligibility: 'unavailable', reason: 'unavailable reason'};
            }
            return {eligibility: 'free'};
        },

        async regiterFreeIdentity(identity, address) {
            log.info({identity, address}, 'regiterFreeIdentity mock called');
            return {success: true, v: 'v', r: 'r', s: 's'};
        },

        async confirmTwitterValidation(identity, address, url) {
            log.info({identity, address, url}, 'confirmTwitterValidation mock called');
            return {success: true, v: 'v', r: 'r', s: 's'};
        }
    };
}

function getIdentityActivationCode(owner) {
    const lowerCaseOwner = owner.toLowerCase();
    const prefix = lowerCaseOwner.indexOf('0x') !== 0 ? '0x' : '';
    const code = crypto
        .createHash('sha256')
        .update(`${prefix}${lowerCaseOwner}`)
        .digest('hex')
        .toLowerCase()
        .slice(32);
    return code;
}

// using 'free' or 'taken' as type here
function getHashedMessage(identity, owner, type) {
    const lowerCaseOwner = owner.toLowerCase();
    const prefix = lowerCaseOwner.indexOf('0x') !== 0 ? '0x' : '';
    const hashedMessage = ethers.utils.id(
        `${identity.toLowerCase()}|${prefix}${lowerCaseOwner}|${type}`
    );
    return hashedMessage;
}

class IdentityController extends PointSDKController {
    constructor(req, rep) {
        super(req);
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

    async openLink() {
        const {url, _csrf} = this.req.body;
        if (_csrf !== csrfTokens.point) {
            return this.rep.status(403).send('CSRF token invalid');
        }
        await open(url);
        return this._response();
    }

    async isIdentityEligible() {
        const {identity} = this.req.params;

        const publicKey = await blockchain.ownerByIdentity(identity);

        if (publicKey !== ethers.constants.AddressZero) {
            return this._response({
                eligibility: 'unavailable',
                reason: 'Identity is already registered on web3'
            });
        }

        const {eligibility, reason} = await TwitterOracle.isIdentityEligible(identity);
        let code;
        if (eligibility === 'tweet') {
            const owner = getNetworkAddress();
            code = getIdentityActivationCode(owner);
        }
        return this._response({eligibility, reason, code});
    }

    async registerIdentity() {
        const {identity, _csrf, code, url} = this.req.body;
        const {host} = this.req.headers;

        if (host !== 'point') {
            return this.rep.status(403).send('Forbidden');
        }
        if (_csrf !== csrfTokens.point) {
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

            if (
                (process.env.MODE === 'e2e' || process.env.MODE === 'zappdev') &&
                !(process.env.USE_ORACLE === 'true')
            ) {
                await blockchain.registerIdentity(identity, owner, Buffer.from(publicKey, 'hex'));
            } else {
                const hashedMessage = getHashedMessage(identity, owner, type);

                await blockchain.registerVerified(
                    identity,
                    owner,
                    Buffer.from(publicKey, 'hex'),
                    hashedMessage,
                    signData
                );
            }

            //log.info(v, r, s);

            log.info(
                {identity, owner, publicKey: publicKey.toString('hex')},
                'Successfully registered new identity'
            );

            log.sendMetric({identity, owner, publicKey: publicKey.toString('hex')});

            try {
                if (
                    !(process.env.MODE === 'e2e' || process.env.MODE === 'zappdev') ||
                    process.env.USE_ORACLE === 'true'
                ) {
                    await registerBountyReferral(owner, type);
                }
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
                await register('taken', {v, r, s});
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
            const code = getIdentityActivationCode(owner);
            return this._response({code});
        }

        return this._response({eligibility, reason});
    }

    async registerSubIdentity() {
        const {subidentity, _csrf} = this.req.body;
        const {host} = this.req.headers;

        if (host !== 'point') {
            return this.rep.status(403).send('Forbidden');
        }
        if (_csrf !== csrfTokens.point) {
            return this.rep.status(403).send('CSRF token invalid');
        }

        // TODO: have a real implementation that calls the Identity contract
        // once we have the method to register sub-identities.
        if (subidentity.includes('error')) {
            return this.rep.status(500).send('Error processing sub-identity.');
        }
        this.rep.status(201);
        return this._status(201)._response({message: 'sub-identity registered.'});
    }

    async resolveDomain() {
        const SUPPORTED_TLD = ['.sol', '.eth'];
        const {domain} = this.req.params;

        const tld = SUPPORTED_TLD.find(tld => domain.endsWith(tld));
        if (!tld) {
            const status = 400;
            const errorMsg = `Unsupported TLD in "${domain}".`;
            this.rep.status(status);
            return this._status(status)._response({errorMsg});
        }

        try {
            let registry;
            switch (tld) {
                case '.sol':
                    registry = await solana.resolveDomain(domain);
                    break;
                case '.eth':
                    registry = await blockchain.resolveDomain(domain);
                    break;
                default:
                    throw new Error(`Did not find a blockchain client for "${tld}" domains.`);
            }
            return this._response(registry);
        } catch (err) {
            if (err.message === 'Invalid name account provided') {
                const status = 400;
                const errorMsg = `No address found for domain name "${domain}".`;
                this.rep.status(status);
                return this._status(status)._response({errorMsg});
            }
            const status = 500;
            this.rep.status(status);
            return this._status(status)._response({errorMsg: err.message});
        }
    }
}

module.exports = IdentityController;
