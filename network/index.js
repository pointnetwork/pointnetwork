const Web3Bridge = require('./web3bridge');
const Kademlia = require('./kademlia');
const KeyValue = require('./keyvalue');

class Network {
    constructor(ctx) {
        this.ctx = ctx;
        this.config = ctx.config.network;
    }

    async start() {
        await this.init();

        // todo: rewrite with threads!
        this.timeout = this.ctx.config.simulation_delay; // todo: ???
        this.timerFn = null;
        this.timerFn = async() => {
            await this.cycle();
            setTimeout(this.timerFn, this.timeout);
        };
        this.timerFn();
    }

    async init() {
        // todo

        // Kadence:
        // NB: We use self-signed certificates, *however*, we perform our own
        // NB: authentication/authorization via ECDSA, so this is fine. We don't
        // NB: care about certificate authorities, just TLS, because our nodes
        // NB: identified by public key hashes and verified by signatures.
        // todo: but it affects the whole application, right? maybe limit it to one process?
        // todo: just use rejectUnauthorized: false on transport-https, extend it
        // process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

        this.web3bridge = new Web3Bridge(this.ctx);
        await this.web3bridge.start(); // todo: do we need await?

        this.kademlia = new Kademlia(this.ctx);
        // await this.kademlia.start(); // todo: do we need await? if so, make sure it doesn't impact everything else

        this.keyvalue = new KeyValue(this.ctx, this);
        this.ctx.keyvalue = this.keyvalue;
        await this.keyvalue.start();
    }

    async cycle() {
        // todo

        // todo: make sure web3 is up
        // todo: make sure raiden is up
        // todo: then signal to other processes that they can start communicating now
    }
}

module.exports = Network;