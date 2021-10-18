const PointSDKController = require('./PointSDKController');

class IdentityController extends PointSDKController {
    constructor(ctx, req, rep) {
        super(ctx);
        this.req = req;
        this.rep = rep;
    }

    async identityToOwner() {
        let identity = this.req.params.identity;
        let owner = await this.ctx.web3bridge.ownerByIdentity(identity);
        return this._response(
            {'owner': owner}
        );
    }

    async ownerToIdentity() {
        let owner = this.req.params.owner;
        let identity = await this.ctx.web3bridge.identityByOwner(owner);
        return this._response({identity});
    }
}

module.exports = IdentityController;
