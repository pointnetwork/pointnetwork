class Wallet {
    constructor(ctx) {
        this.ctx = ctx;
        this.config = ctx.config.client.wallet;

        this.network_account = this.config.account;
    }

    async start() {
        // todo
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