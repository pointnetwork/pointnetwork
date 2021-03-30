const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

class Wallet {
    constructor(ctx) {
        this.ctx = ctx;
        this.config = ctx.config.client.wallet;

        this.network_account = this.config.account;
    }

    async start() {
        this.keystore_path = path.join(this.ctx.datadir, this.config.keystore_path);
        if (! fs.existsSync(this.keystore_path)) {
            mkdirp.sync(this.keystore_path);
        }

        // todo: other setup?
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