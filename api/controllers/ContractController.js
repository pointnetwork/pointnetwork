const PointController = require('./PointController')
const helpers = require('./helpers/WalletHelpers')

class ContractController extends PointController {
    constructor(ctx, req, reply) {
        super(ctx);
        this.req = req;
        this.walletToken = this.req.headers['wallet-token'];
        this.payload = req.body;
        this.reply = reply;

        // load wallet
        const wallet = helpers.initWallet(ctx, req.headers['wallet-token'])
        wallet ? this.wallet = wallet : this.reply.callNotFound()
    }

    async call() {
        const host = this.req.query.host;
        const contractName = this.req.query.contractName;
        const method = this.req.query.method;
        const params = this.req.query.params;

        let data = await this.ctx.web3bridge.callContract(host, contractName, method, params);

        return this._response(data);
     }

     async send() {
        if(this.wallet) {
            const host = this.payload.host;
            const contractName = this.payload.contractName;
            const method = this.payload.method;
            const params = this.payload.params;
            const gasLimit = this.payload.gasLimit;
            const amountInWei = this.payload.amountInWei;

            let data = await this.ctx.web3bridge.sendToContract(host, contractName, method, params, amountInWei, gasLimit);

            return this._response(data);
        }
     }
}

module.exports = ContractController;