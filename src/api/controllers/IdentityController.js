const PointSDKController = require('./PointSDKController');
const blockchain = require('../../network/blockchain');

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
}

module.exports = IdentityController;
