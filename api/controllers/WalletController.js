const PointSDKController = require('./PointSDKController');
const fs = require('fs');
const ethereumjs = require('ethereumjs-util');
const helpers = require('./helpers/WalletHelpers');

let web3;

class WalletController extends PointSDKController {
    constructor(ctx, req, reply) {
        super(ctx, req);
        web3 = this.ctx.network.web3;
        this.keystorePath = this.ctx.wallet.keystore_path;
        this.payload = req.body;
        this.reply = reply;
        this.defaultWallet = web3.eth.accounts.wallet[0];
    }

    async tx() {
        let from = this.defaultWallet.address;
        let to = this.payload.to;
        let value = this.payload.value;

        let receipt = await this.ctx.wallet.sendTransaction(from, to, value);
        let transactionHash = receipt.transactionHash;

        return this._response({
            transactionHash
        });
    }

    publicKey() {
        let publicKeyBuffer = ethereumjs.privateToPublic(this.defaultWallet.privateKey);
        let publicKey = ethereumjs.bufferToHex(publicKeyBuffer);

        // return the public key
        return this._response({
            publicKey
        });
    }

    address() {
        let address = this.defaultWallet.address;

        // return the public key
        return this._response({
            address
        });
    }

    async balance() {
        let balance = (await this.web3.eth.getBalance(this.defaultWallet.address)).toString();

        // return the wallet balance
        return this._response({
            balance
        });
    }

    hash() {
        let partialPK = this.defaultWallet.privateKey.substr(0, 33);
        let hashBuffer = ethereumjs.sha256(Buffer.from(partialPK));
        let hash = ethereumjs.bufferToHex(hashBuffer);

        return this._response({
            hash
        });
    }
}

module.exports = WalletController;