const PointSDKController = require('./PointSDKController');
const ethereum = require('../../network/providers/ethereum.js');
const solana = require('../../network/providers/solana.js');
const {getNetworkPublicKey, getNetworkAddress} = require('../../wallet/keystore.js');
import logger from '../../core/log.js';
const log = logger.child({Module: 'IdentityController'});
const crypto = require('crypto');
const axios = require('axios');
const ethers = require('ethers');
const {isChineseTimezone} = require('../../util/index.js');
const open = require('open');
const {default: csrfTokens} = require('../../client/zweb/renderer/csrfTokens');
const {getIdentity} = require('../../name_service/identity');
const config = require('config');
const Web3 = require('web3');
const {addToCache} = require('../../name_service/identity-cache');
const {parseDomainRegistry} = require('../../name_service/registry');

const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';

const IKV_PUT_INTERFACE = {
    inputs: [
        {internalType: 'string', name: 'identity', type: 'string'},
        {internalType: 'string', name: 'key', type: 'string'},
        {internalType: 'string', name: 'value', type: 'string'},
        {internalType: 'string', name: 'version', type: 'string'}
    ],
    name: 'ikvPut',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
};

const DEFAULT_NETWORK = config.get('network.default_network');
const IDENTITY_CONTRACT_ADDRESS = config.get(`network.web3.${DEFAULT_NETWORK}.identity_contract_address`);

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

if (['e2e', 'zappdev', 'test'].includes(process.env.MODE) && process.env.USE_ORACLE !== 'true') {
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
    return ethers.utils.id(`${identity.toLowerCase()}|${prefix}${lowerCaseOwner}|${type}`);
}

class IdentityController extends PointSDKController {
    constructor(req, rep) {
        super(req);
        this.req = req;
        this.rep = rep;
    }

    async isIdentityRegistered() {
        const identityData = await getIdentity();
        return this._response({
            identityRegistred: Boolean(identityData.identity),
            ...identityData
        });
    }

    async identityRegistered() {
        const identity = this.req.query.identity;
        if (!identity) {
            return this.res.status(400).send('Missing query param: identity');
        }

        const owner = await ethereum.ownerByIdentity(identity);
        this.rep.status(200).send({identityRegistered: owner && owner !== ADDRESS_ZERO});
    }

    async identityToOwner() {
        const identity = this.req.params.identity;
        let owner = '';
        let network = '';
        let pointAddress = '';

        if (identity.endsWith('.sol')) {
            const registry = await solana.resolveDomain(identity);
            const domainData = parseDomainRegistry(registry);
            owner = registry.owner;
            pointAddress = domainData.pointAddress;
            network = 'solana';
        } else if (identity.endsWith('.eth')) {
            const registry = await ethereum.resolveDomain(identity);
            owner = registry.owner;
            pointAddress = registry.owner;
            network = 'ethereum';
        } else {
            const address = await ethereum.ownerByIdentity(identity);
            owner = address;
            pointAddress = address;
            network = 'point';
        }

        return this._response({owner, network, pointAddress});
    }

    async ownerToIdentity() {
        const owner = this.req.params.owner;
        let key = '';
        let targets = [];
        if (solana.isAddress(owner)) {
            key = 'solAddress';
            targets = ['solana'];
        } else if (ethereum.isAddress(owner)) {
            key = 'ethAddress';
            targets = ['point', 'ethereum'];
        }

        if (!key || targets.length === 0) {
            this.rep.status(400);
            return this._status(400)._response('Invalid owner address provided.');
        }

        const {identity} = await getIdentity({[key]: owner, targets});
        return this._response({identity});
    }

    async publicKeyByIdentity() {
        const identity = this.req.params.identity;

        if (identity.endsWith('.eth')) {
            this.rep.status(422);
            return this._status(422)._response('This endpoint does not support ENS identities.');
        }

        if (identity.endsWith('.sol')) {
            const registry = await solana.resolveDomain(identity);
            const {pointPublicKey} = parseDomainRegistry(registry);
            return this._response({publicKey: pointPublicKey ? `0x${pointPublicKey}` : ''});
        }

        const publicKey = await ethereum.commPublicKeyByIdentity(identity);
        return this._response({publicKey});
    }

    async blockTimestamp() {
        const blockNumber = this.req.body.blockNumber;
        const timestamp = await ethereum.getBlockTimestamp(blockNumber);
        return this._response({timestamp});
    }

    async openLink() {
        const {url, _csrf} = this.req.body;
        //checks the CSFR to open a link.
        if (_csrf !== csrfTokens.point) {
            return this.rep.status(403).send('CSRF token invalid');
        }
        await open(url);
        return this._response();
    }

    async isIdentityEligible() {
        const {identity} = this.req.params;

        const publicKey = await ethereum.ownerByIdentity(identity);

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
        //checks the csrf to register an identity
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
                await ethereum.registerIdentity(identity, owner, Buffer.from(publicKey, 'hex'));
            } else {
                const hashedMessage = getHashedMessage(identity, owner, type);

                await ethereum.registerVerified(
                    identity,
                    owner,
                    Buffer.from(publicKey, 'hex'),
                    hashedMessage,
                    signData
                );
            }

            // Add to cache so that users don't have to wait until expiration to see the updates.
            addToCache({address: owner, identity, publicKey, network: 'point'});
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
                return this._response({success: false, reason: error.message});
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
                return this._response({success: false, reason: error.message});
            }
        }

        if (eligibility === 'tweet') {
            const code = getIdentityActivationCode(owner);
            return this._response({code});
        }

        return this._response({eligibility, reason});
    }

    async registerSubIdentity() {
        const {subidentity, parentIdentity, _csrf} = this.req.body;
        const {host} = this.req.headers;

        if (host !== 'point') {
            return this.rep.status(403).send('Forbidden');
        }

        //check the csrf token to register an subidentity
        if (_csrf !== csrfTokens.point) {
            return this.rep.status(403).send('CSRF token invalid');
        }

        const publicKey = getNetworkPublicKey();
        const owner = getNetworkAddress();

        log.info(
            {
                subidentity: `${subidentity}.${parentIdentity}`,
                owner,
                publicKey,
                len: Buffer.byteLength(publicKey, 'utf-8'),
                parts: [`0x${publicKey.slice(0, 32)}`, `0x${publicKey.slice(32)}`]
            },
            'Registering a new subidentity'
        );

        await ethereum.registerSubIdentity(
            subidentity,
            parentIdentity,
            owner,
            Buffer.from(publicKey, 'hex')
        );

        log.info(
            {
                subidentity: `${subidentity}.${parentIdentity}`,
                owner,
                publicKey: publicKey.toString('hex')
            },
            'Successfully registered new subidentity'
        );

        this.rep.status(200);
        return this._status(200)._response({message: 'subidentity registered.'});
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
                    registry = await ethereum.resolveDomain(domain);
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

    async ikvPut() {
        const {identity, key, value, version = 'latest', network = DEFAULT_NETWORK} = this.req.body;

        try {
            const web3 = new Web3();
            const data = web3.eth.abi.encodeFunctionCall(IKV_PUT_INTERFACE, [
                identity,
                key,
                value,
                version
            ]);
            await ethereum.send({
                method: 'eth_sendTransaction',
                params: [
                    {
                        from: getNetworkAddress(),
                        to: IDENTITY_CONTRACT_ADDRESS,
                        data
                    }
                ],
                id: new Date().getTime(),
                network
            });
            this.rep.status(200).send('Success');
        } catch (e) {
            log.error('IKV Put error');
            log.error(e);
            this.rep.status(500).send('Internal engine error');
        }
    }
}

module.exports = IdentityController;
