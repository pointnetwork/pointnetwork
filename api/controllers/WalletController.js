const PointSDKController = require('./PointSDKController');
const fs = require('fs');
const ethereumjs = require('ethereumjs-util');
const helpers = require('./helpers/WalletHelpers');

let web3;

class WalletController extends PointSDKController {
    constructor(ctx, req, reply) {
        super(ctx);
        web3 = this.ctx.network.web3;
        this.keystorePath = this.ctx.wallet.keystore_path;
        this.payload = req.body;
        this.reply = reply;
        this.wallet = null;
        // if the wallet is required for the current request
        if (this._walletRequired(req)) {
            const wallet = helpers.initWallet(ctx, req.headers['wallet-token']);
            wallet ? this.wallet = wallet : this.reply.callNotFound();
        }
    }

    generate() {
        let passcode = this.web3.utils.randomHex(32); // todo: improve entropy
        let keystoreId = this.ctx.wallet.generate(passcode);

        return this._response({
            walletId: keystoreId,
            passcode
        });
    }

    async tx() {
        let from = this.wallet.address;
        let to = this.payload.to;
        let value = this.payload.value;

        let receipt = await this.ctx.wallet.sendTransaction(from, to, value);
        let transactionHash = receipt.transactionHash;

        return this._response({
            transactionHash
        });
    }

    publicKey() {
        let publicKeyBuffer = ethereumjs.privateToPublic(this.wallet.privateKey);
        let publicKey = ethereumjs.bufferToHex(publicKeyBuffer);

        // return the public key
        return this._response({
            publicKey
        });
    }

    address() {
        let address = this.wallet.address;

        // return the public key
        return this._response({
            address
        });
    }

    async balance() {
        let balance = (await this.web3.eth.getBalance(this.wallet.address)).toString();

        // return the wallet balance
        return this._response({
            balance
        });
    }

    hash() {
        let partialPK = this.wallet.privateKey.substr(0, 33);
        let hashBuffer = ethereumjs.sha256(Buffer.from(partialPK));
        let hash = ethereumjs.bufferToHex(hashBuffer);

        return this._response({
            hash
        });
    }

    /* Private Functions */
    _walletRequired(req) {
        return req.url !== '/api/wallet/generate';
    }
}

module.exports = WalletController;