const PointSDKController = require('./PointSDKController');

class IdentityController extends PointSDKController {
    constructor(ctx, req, rep) {
        super(ctx);
        this.req = req;
        this.rep = rep;
    }

    async identityToOwner() {
        const identity = this.req.params.identity;
        const owner = await this.ctx.web3bridge.ownerByIdentity(identity);
        return this._response({owner: owner});
    }

    async ownerToIdentity() {
        const owner = this.req.params.owner;
        const identity = await this.ctx.web3bridge.identityByOwner(owner);
        return this._response({identity});
    }
}

module.exports = IdentityController;
