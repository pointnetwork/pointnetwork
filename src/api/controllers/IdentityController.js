const PointSDKController = require('./PointSDKController');
const blockchain = require('../../network/blockchain');
const {getNetworkPublicKey, getNetworkAddress} = require('../../wallet/keystore');
const logger = require('../../core/log');
const log = logger.child({Module: 'IdentityController'});

const TwitterOracle = {
    async isIdentityValidated(/*identity, code*/) {
        // validate that the code was tweeted
        return true;
    },

    async isIdentityAvailable(/*identity*/) {
        // verify that the identity was not used by a twitter account
        return {available: false};
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
        const {identity, _csrf, code} = this.req.body;
        const {host} = this.req.headers;

        if (host !== 'point') {
            return this.rep.status(403).send('Forbidden');
        }
        if (_csrf !== this.ctx.csrf_tokens.point) {
            return this.rep.status(403).send('CSRF token invalid');
        }

        const publicKey = getNetworkPublicKey();
        const owner = getNetworkAddress();

        async function register() {
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
        
        // verify that the identity was validated on twitter
        if (code) { 
            const validated = await TwitterOracle.isIdentityValidated(identity, code);
            if (!validated) {
                return {
                    status: 500,
                    data: {error: 'Identity was not validated yet'}
                };
            }

            // register that the code was successfuly validated
            await blockchain.setIdentityAsValidated(code, identity, owner);

            return await register();
        }

        const {available} = await TwitterOracle.isIdentityAvailable(identity);
        // if the identity is being used on twitter, then ask for a validation tweet
        if (!available) {
            const code = `${identity}${new Date().getTime()}`;
            // register the validation code onchain
            await blockchain.addValidationCode(code, identity, owner);
            return {
                status: 200,
                data: {code}
            };
        }

        return await register();
    }
}

module.exports = IdentityController;
