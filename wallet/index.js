const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const events = require('events');
let ethereumjs = require('ethereumjs-util');

class Wallet {
    static get TRANSACTION_EVENT() { return 'TRANSACTION_EVENT'; }

    constructor(ctx) {
        this.ctx = ctx;
        this.config = ctx.config.client.wallet;
        this.network_account = this.config.account;

        // Events
        // transactionEventEmitter emits the TRANSACTION_EVENT type
        this.transactionEventEmitter = new events.EventEmitter();
    }

    async start() {
        this.keystore_path = path.join(this.ctx.datadir, this.config.keystore_path);
        if (! fs.existsSync(this.keystore_path)) {
            mkdirp.sync(this.keystore_path);
        }

        // todo: other setup?
    }

    get web3() {
        return this.ctx.network.web3;
    }

    // get transactionEvents() {
    //     return this.transactionEventEmitter;
    // }

    saveDefaultWalletToKeystore() {
        // use the hard coded wallet id, passcode, address and private key to save to the nodes keystore
        let id = this.config.id;
        let passcode = this.config.passcode;
        let wallet = this.ctx.network.web3.eth.accounts.wallet[0];
        let keystore = wallet.encrypt(passcode);
        fs.writeFileSync(`${this.keystore_path}/${id}`, JSON.stringify(keystore));
    }

    async sendTransaction(from, to, value) {
        let receipt = await this.web3.eth.sendTransaction({from: from, to: to, value: value, gas: 21000});
        this.transactionEventEmitter.emit(Wallet.TRANSACTION_EVENT, {transactionHash: receipt.transactionHash, from, to, value});
        return receipt;
    }

    generate(passcode) {
        let account = this.web3.eth.accounts.create(this.web3.utils.randomHex(32));
        let wallet = this.web3.eth.accounts.wallet.add(account);
        let keystore = this.saveWalletToKeystore(wallet, passcode);

        // TODO: remove
        this._fundWallet(account.address);

        return keystore.id;
    }

    saveWalletToKeystore(wallet, passcode) {
        let keystore = wallet.encrypt(passcode);
        fs.writeFileSync(`${this.keystore_path}/${keystore.id}`, JSON.stringify(keystore));

        return keystore;
    }

    loadWalletFromKeystore(walletId, passcode) {
        // todo what if it does not exist?
        if(fs.existsSync(`${this.keystore_path}/${walletId}`)) {
            let keystoreBuffer = fs.readFileSync(`${this.keystore_path}/${walletId}`);
            let keystore = JSON.parse(keystoreBuffer);

            // decrypt it using the passcode
            let decryptedWallets = this.web3.eth.accounts.wallet.decrypt([keystore], passcode);

            let address = ethereumjs.addHexPrefix(keystore.address);
            return decryptedWallets[address]; // return the wallet using the address in the loaded keystore
        } else {
            return null;
        }
    }

    async getNetworkAccountBalanceInWei() {
        return await this.web3.eth.getBalance(this.network_account);
    }

    getNetworkAccountPrivateKey() {
        // todo: Use keystore instead of config!!!
        return this.config.privateKey;
    }

    getNetworkAccount() {
        return this.network_account;
    }

    // todo: remove
    _fundWallet(_address) {
        this.web3.eth.sendTransaction({from: this.network_account, to: _address, value: 1e18, gas: 21000});
    }
}

module.exports = Wallet;