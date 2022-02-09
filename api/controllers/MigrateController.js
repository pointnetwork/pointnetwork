const PointSDKController = require('./PointSDKController');

class MigrateController extends PointSDKController {
    constructor(ctx, req, rep) {
        super(ctx);
        this.req = req;
        this.rep = rep;
    }

    async migrate() {
        const identity = 'twitter';
        const owner = await this.ctx.web3bridge.ownerByIdentity(identity);

        return this._response({owner: owner});
    }
}

module.exports = MigrateController;
