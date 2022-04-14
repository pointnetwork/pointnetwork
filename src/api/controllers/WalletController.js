const PointSDKController = require('./PointSDKController');
const ethereumjs = require('ethereumjs-util');
const blockchain = require('../../network/blockchain');
const {encryptData, decryptData} = require('../../client/encryptIdentityUtils');

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
        // '0x' should be removed
        const privateKeyBuffer = Buffer.from(this.defaultWallet.privateKey.slice(2), 'hex');
        const isValidPrivate = ethereumjs.isValidPrivate(privateKeyBuffer);
        if (!isValidPrivate) {
            throw Error('invalid private key');
        }

        const publicKeyBuffer = ethereumjs.privateToPublic(privateKeyBuffer);
        const publicKey = ethereumjs.bufferToHex(publicKeyBuffer);

        // return the public key
        return this._response({publicKey});
    }

    address() {
        const address = this.defaultWallet.address;

        // return the public key
        return this._response({address});
    }

    async balance() {
        const balance = (
            await blockchain.getBalance(this.defaultWallet.address)
        ).toString();

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
        const {
            encryptedData, 
            encryptedSymmetricObj: unparsedEncryptedSymmetricObjJSON
        } = this.payload;
        const {host} = this.req.headers;
        const privateKey = this.defaultWallet.privateKey;

        const encryptedSymmetricObjJS = JSON.parse(unparsedEncryptedSymmetricObjJSON);
        const encryptedSymmetricObj = {};
        for (const k in encryptedSymmetricObjJS) {
            encryptedSymmetricObj[k] = Buffer.from(encryptedSymmetricObjJS[k], 'hex');
        }
        const decryptedData = await decryptData(
            host,
            Buffer.from(encryptedData, 'hex'),
            encryptedSymmetricObj,
            privateKey.slice(2)
        );
        return this._response({decryptedData: decryptedData.plaintext.toString()});
    }
}

module.exports = WalletController;
