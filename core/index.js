const _ = require('lodash');
const path = require('path');
const fs = require('fs');

const ServiceProvider = require('../service_provider');
const ApiServer = require('../api');
const Network = require('../network');
const Client = require('../client');
const Wallet = require('../wallet');
const DB = require('../db');
const utils = require('./utils');

class Core {
    constructor(ctx) {
        this.ctx = ctx;
    }

    async start() {
        this.ctx.exit = () => { process.exit(1) };
        this.ctx.die = (err) => { this.ctx.log.fatal(err); this.ctx.exit(); };

        this.ctx.utils = utils;

        // todo: remove in prod
        // if (this.ctx.config.client.wallet.account !== '0x989695771d51de19e9ccb943d32e58f872267fcc') {
            DB.__debugClearCompletely(this.ctx);
        // }

        await this.initDatabase();
        await this.initWallet();
        await this.initApiServer();
        await this.initNetwork();
        await this.initServiceProvider();
        await this.initClient();

        await this.postInit();
    }

    async postInit() {
        setTimeout(async() => {
            // let fl = fs.readFileSync('/Users/s/.point/test2/deployer_cache/e5252f3d40baf38bd208632ff495f7ce9da8ff36');
            // let fl = fs.readFileSync('./example/example.z/views/star-icon.png');
            //
            // var chunks = require('buffer-chunks');
            // var list = chunks(fl, 64);
            // var found = false;
            // for(var l of list) {
            //     if (l.toString('hex').includes('7ac49d9d3')) found = true;
            //
            //     if (found) {
            //         console.log(l.toString('hex'));
            //         console.log(l.toString());
            //     }
            // }
            //
            // console.log(this.ctx.utils.hashFnHex(fl));
            // this.ctx.die();

            // console.log(await this.ctx.network.web3bridge.putZRecord('example', '0x05990c8f559f3f16b84595bb46aa6e7ab3b7a19d'));
            // console.log(await this.ctx.network.web3bridge.getZRecord('example'));
            // this.ctx.die();
        }, 0);
    }

    async initApiServer() {
        const api_server = new ApiServer(this.ctx);
        this.ctx.api_server = api_server;
        await api_server.start();
    }

    async initServiceProvider() {
        // todo:
        // if (this.ctx.config.service_provider.enabled === true) {
        //     this.ctx.service_provider = new ServiceProvider(ctx);
        //     await this.ctx.service_provider.start();
        // } else {
        //     this.ctx.log.info("Service provider functionality disabled, skipping.");
        // }
    }

    async initNetwork() {
        this.ctx.network = new Network(ctx);
        await this.ctx.network.start();
    }

    async initClient() {
        this.ctx.client = new Client(ctx);
        await this.ctx.client.start();
    }

    async initWallet() { // todo: rename to keychain?
        this.ctx.wallet = new Wallet(ctx);
        await this.ctx.wallet.start();
    }

    async initDatabase() {
        this.ctx.db = new DB(this.ctx);
        await this.ctx.db.init();
    }

}

module.exports = Core;
