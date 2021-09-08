const _ = require('lodash');
const path = require('path');
const fs = require('fs');

const ApiServer = require('../api');
const Network = require('../network');
const Client = require('../client');
const Provider = require('../provider');
const Wallet = require('../wallet');
const DB = require('../db');

class Core {
    constructor(ctx) {
        this.ctx = ctx;
    }

    async start() {
        // todo: remove in prod
        // if (this.ctx.config.client.wallet.account !== '0x989695771D51dE19e9ccb943d32E58F872267fcC') {
        // DB.__debugClearCompletely(this.ctx);
        // }

        await this.initApiServer();
        await this.initWallet();
        await this.initNetwork();
        await this.initClient();
        await this.initProvider();

        await this.postInit();
    }

    async postInit() {
        await this.ctx.wallet.saveDefaultWalletToKeystore();

        setTimeout(async() => {
            // Here we can put something that will run at each node start, but better not to
        }, 0);
    }

    async initApiServer() {
        const api_server = new ApiServer(this.ctx);
        this.ctx.api_server = api_server;
        await api_server.start();
    }

    async initNetwork() {
        this.ctx.network = new Network(this.ctx);
        await this.ctx.network.start();
    }

    async initClient() {
        this.ctx.client = new Client(this.ctx);
        await this.ctx.client.start();
    }

    async initWallet() { // todo: rename to keychain?
        this.ctx.wallet = new Wallet(this.ctx);
        await this.ctx.wallet.start();
    }

    async initProvider() {
        this.ctx.provider = new Provider(this.ctx);
        await this.ctx.provider.start();
    }

}

module.exports = Core;
