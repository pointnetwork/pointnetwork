const PointController = require('./PointController')

class ContractController extends PointController {
    constructor(ctx, req, reply) {
        super(ctx);
        this.req = req;
        this.payload = req.body;
        this.reply = reply;
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
        this.walletToken = this.req.headers['wallet-token'];

        if(this._loadWallet()) {
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

     /* Private Functions */

    _validateWalletToken() {
        if(this.walletToken === undefined) {
            throw new Error('Missing wallet-token header.')
        }
        if(this.walletToken.length < 69) {
            throw new Error('wallet-token invalid.')
        }
    }

    _parseWalletToken() {
        this._validateWalletToken();
        this.walletId = this.walletToken.slice(0,36)
        this.passcode = this.walletToken.slice(37, 103)
    }

    _loadWallet() {
        this._parseWalletToken()
        // load the wallet from the keystore file
        this.wallet = this.ctx.wallet.loadWalletFromKeystore(this.walletId, this.passcode)
        if(this.wallet) {
            return true
        } else {
            // if wallet is null then reply with 404 not found and return false
            this.reply.callNotFound()
            return false
        }
    }
}

module.exports = ContractController;