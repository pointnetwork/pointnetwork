const PointSDKController = require('./PointSDKController');
const helpers = require('./helpers/WalletHelpers');
const _ = require('lodash');

class ContractController extends PointSDKController {
    constructor(ctx, req, reply) {
        super(ctx);
        this.req = req;
        this.host = this.req.headers.host;
        // TODO: also verify the domain is registered in the Identity contract
        if (! _.endsWith(this.host, '.z')) return reply.callNotFound();

        this.payload = req.body;
        this.reply = reply;
    }

    async call() {
        const contract = this.payload.contract;
        const method = this.payload.method;
        // Note params must be in a valid array format for parsing
        // since this is passed via url params the type will be string
        // params=["String Param", 999, true, "Another string"] etc...
        const params = this.payload.params ? this.payload.params : [];

        let data = await this.ctx.web3bridge.callContract(this.host, contract, method, params);

        return this._response(data);
    }

    async load() {
        const contractName = this.req.params.contract;

        let contract = await this.ctx.web3bridge.loadWebsiteContract(this.host, contractName);

        let data = {
            address: contract._address,
            abi: contract._jsonInterface
        };

        return this._response(data);
    }

    async send() {
        const contract = this.payload.contract;
        const method = this.payload.method;
        const gasLimit = this.payload.gasLimit;
        const amountInWei = this.payload.amountInWei;

        // Note params must be in a valid array format for parsing
        // since this is passed via url params the type will be string
        // params=["String Param", 999, true, "Another string"] etc...
        const params = this.payload.params ? this.payload.params : [];
        const options = {
            amountInWei,
            gasLimit
        };

        let data = await this.ctx.web3bridge.sendToContract(this.host, contract, method, params, options);

        return this._response(data);
    }
}

module.exports = ContractController;