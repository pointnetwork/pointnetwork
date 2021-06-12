const PointSDKController = require('./PointSDKController')
const helpers = require('./helpers/WalletHelpers')

class ContractController extends PointSDKController {
    constructor(ctx, req, reply) {
        super(ctx);
        this.host = this.req.headers.host;
        if (! _.endsWith(this.host, '.z')) return reply.callNotFound()

        this.req = req;
        this.walletToken = this.req.headers['wallet-token'];
        this.payload = req.body;
        this.reply = reply;

        // if the wallet is required for the current request
        if(this._walletRequired(req)) {
            const wallet = helpers.initWallet(ctx, req.headers['wallet-token'])
            wallet ? this.wallet = wallet : this.reply.callNotFound()
        }
    }

    async call() {
        const contractName = this.req.query.contractName;
        const method = this.req.query.method;
        // Note params must be in a valid array format for parsing
        // since this is passed via url params the type will be string
        // params=["String Param", 999, true, "Another string"] etc...
        // TODO: Error handing!
        const params = this.req.query.params ? JSON.parse(this.req.query.params) : [];

        let data = await this.ctx.web3bridge.callContract(this.host, contractName, method, params);

        return this._response(data);
     }

     async send() {
        if(this.wallet) {
            const contractName = this.payload.contractName;
            const method = this.payload.method;
            const params = this.payload.params;
            const gasLimit = this.payload.gasLimit;
            const amountInWei = this.payload.amountInWei;

            let data = await this.ctx.web3bridge.sendToContract(this.host, contractName, method, params, amountInWei, gasLimit);

            return this._response(data);
        }
     }

     /* Private Functions */
    _walletRequired(req) {
        let fn = req.url.slice(req.url.lastIndexOf('/') + 1, req.url.indexOf('?'))
        return fn != 'call'
    }
}

module.exports = ContractController;