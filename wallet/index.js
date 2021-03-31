const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const events = require('events')

class Wallet {
    constructor(ctx) {
        this.ctx = ctx;
        this.config = ctx.config.client.wallet;

        this.network_account = this.config.account;

        // Events
        this.TRANSACTION_EVENT = 'TRANSACTION_EVENT'
        this.transactionEventEmitter = new events.EventEmitter()
        this._initEventHandlerFunction()
    }

    async start() {
        this.keystore_path = path.join(this.ctx.datadir, this.config.keystore_path);
        if (! fs.existsSync(this.keystore_path)) {
            mkdirp.sync(this.keystore_path);
        }

        // todo: other setup?
    }

    // this is set by the WalletConnectSocket once a connection is established with a client
    set wss(_wss) {
        this.wsserver = _wss
    }

    _initEventHandlerFunction() {
        this.transactionEventEmitter.on(this.TRANSACTION_EVENT, (transactionHash, from, to, value) => {
            if (this.wsserver) {
                let payload = {
                    data: {
                        transactionHash: transactionHash,
                        from,
                        to,
                        value
                    }
                }
                this.wsserver.publishToClients(payload)
            }
        })
    }

    async sendTransaction(from, to, value) {
        let receipt = await this.ctx.network.web3.eth.sendTransaction({from: from, to: to, value: value, gas: 21000})
        this.transactionEventEmitter.emit(this.TRANSACTION_EVENT, receipt.transactionHash, from, to, value)
        return receipt
    }

    async getNetworkAccountBalanceInWei() {
        return await this.ctx.network.web3.eth.getBalance(this.network_account);
    }

    getNetworkAccountPrivateKey() {
        // todo: Use keystore instead of config!!!
        return this.config.privateKey;
    }

    getNetworkAccount() {
        return this.network_account;
    }
}

module.exports = Wallet;