const PointSDKController = require('./PointSDKController');
const ethereumjs = require('ethereumjs-util');
const blockchain = require('../../network/blockchain');
const {getNetworkPublicKey} = require('../../wallet/keystore');
const {
    encryptData,
    decryptData,
    getEncryptedSymetricObjFromJSON
} = require('../../client/encryptIdentityUtils');

class WalletController extends PointSDKController {
    constructor(ctx, req, reply) {
        super(ctx, req);
        this.req = req;
        this.payload = req.body;
        this.reply = reply;
        this.defaultWallet = blockchain.getWallet();
    }

    async tx() {
        const from = this.defaultWallet.address;
        const to = this.payload.to;
        const value = this.payload.value;

        const receipt = await this.ctx.wallet.sendTransaction(from, to, value);
        const transactionHash = receipt.transactionHash;

        return this._response({transactionHash});
    }

    publicKey() {
        const publicKey = getNetworkPublicKey();

        return this._response({publicKey});
    }

    address() {
        const address = this.defaultWallet.address;

        return this._response({address});
    }

    async balance() {
        const balance = (await blockchain.getBalance(this.defaultWallet.address)).toString();

        // return the wallet balance
        return this._response({balance});
    }

    hash() {
        const partialPK = this.defaultWallet.privateKey.substr(0, 33);
        const hashBuffer = ethereumjs.sha256(Buffer.from(partialPK));
        const hash = ethereumjs.bufferToHex(hashBuffer);

        return this._response({hash});
    }

    async encryptData() {
        const {publicKey, data} = this.payload;
        const {host} = this.req.headers;
        const encryptedData = await encryptData(host, data, publicKey);
        return this._response(encryptedData);
    }

    async decryptData() {
        const {host} = this.req.headers;
        const privateKey = this.defaultWallet.privateKey;

        const encryptedSymmetricObj = getEncryptedSymetricObjFromJSON(
            JSON.parse(this.payload.encryptedSymmetricObj)
        );
        const decryptedData = await decryptData(
            host,
            Buffer.from(this.payload.encryptedData, 'hex'),
            encryptedSymmetricObj,
            privateKey.slice(2)
        );
        return this._response({decryptedData: decryptedData.plaintext.toString()});
    }
}

module.exports = WalletController;
