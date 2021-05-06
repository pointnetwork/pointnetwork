const _ = require('lodash');
const path = require('path');
const fs = require('fs');

const ApiServer = require('../api');
const Network = require('../network');
const Client = require('../client');
const Provider = require('../provider');
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
        // if (this.ctx.config.client.wallet.account !== '0x989695771D51dE19e9ccb943d32E58F872267fcC') {
            // DB.__debugClearCompletely(this.ctx);
        // }

        await this.initDatabase();
        await this.initApiServer();
        await this.initWallet();
        await this.initNetwork();
        await this.initClient();
        await this.initProvider();

        await this.postInit();
    }

    async postInit() {
        await this.ctx.wallet.saveDefaultWalletToKeystore()

        setTimeout(async() => {
            // register example.z
            // const at = this.ctx.config.network.identity_contract_address;
            // const abiFileName = path.join(this.ctx.basepath, 'truffle/build/contracts/Identity.json');
            // const abiFile = JSON.parse(fs.readFileSync(abiFileName));
            // const abi = abiFile.abi;
            // const contract = new this.ctx.web3.eth.Contract(abi, at);
            // const method = contract.methods.register('example', this.ctx.web3bridge.address);
            // console.log(await this.ctx.web3bridge.web3send(method));
            // return this.ctx.die();

            // if (this.ctx.config.client.wallet.account.toLowerCase() === '0x438773aCB694ed5492433d6E78E6D8C389136067'.toLowerCase()) { // test2
            //     const catFile = path.join(this.ctx.basepath, '_local/test_files/abitest.txt');
            //     let uploaded;
            //     console.log(uploaded = await this.ctx.client.storage.putFile(catFile));
            //     console.log('uploaded, downloading...');
            //     console.log(await this.ctx.client.storage.getFile(uploaded.id));
            //     console.log('downloaded');
            // }

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

            // console.log(await this.ctx.web3bridge.putZRecord('example', '0x05990c8f559f3f16B84595BB46Aa6E7AB3b7a19D'));
            // console.log(await this.ctx.web3bridge.getZRecord('example'));
            // this.ctx.die();
        }, 0);
    }

    async initApiServer() {
        const api_server = new ApiServer(this.ctx);
        this.ctx.api_server = api_server;
        await api_server.start();
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

    async initProvider() {
        this.ctx.provider = new Provider(ctx);
        await this.ctx.provider.start();
    }

    async initDatabase() {
        this.ctx.db = new DB(this.ctx);
        await this.ctx.db.init();
    }

}

module.exports = Core;
