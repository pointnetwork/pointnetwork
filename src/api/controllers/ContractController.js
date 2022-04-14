const PointSDKController = require('./PointSDKController');
const _ = require('lodash');
const blockchain = require('../../network/blockchain');

class ContractController extends PointSDKController {
    constructor(ctx, req, reply) {
        super(ctx);
        this.req = req;
        this.host = this.req.headers.host;
        // TODO: also verify the domain is registered in the Identity contract
        if (!_.endsWith(this.host, '.point') && !this.host === 'point') return reply.callNotFound();

        this.payload = req.body;
        this.reply = reply;
    }

    async call() {
        const contract = this.payload.contract;
        const method = this.payload.method;
        
        // Note params must be in a valid array format for parsing
        // since this is passed via url params the type will be string
        // params=["String Param", 999, true, "Another string"] etc...
        const params = this.payload.params ? this.payload.params : [];
        const host = this.payload.host === '@' ? '@': this.host; //allow call identity contract

        const data = await blockchain.callContract(host, contract, method, params);

        return this._response(data);
    }

    async load() {
        const contractName = this.req.params.contract;

        const contract = await blockchain.loadWebsiteContract(this.host, contractName);

        const data = {
            address: contract._address,
            abi: contract._jsonInterface
        };

        return this._response(data);
    }

    async send() {
        const contract = this.payload.contract;
        const method = this.payload.method;
        const gasLimit = this.payload.gasLimit;
        const amountInWei = this.payload.amountInWei;

        // Note params must be in a valid array format for parsing
        // since this is passed via url params the type will be string
        // params=["String Param", 999, true, "Another string"] etc...
        const params = this.payload.params ? this.payload.params : [];
        const options = {
            amountInWei,
            gasLimit
        };

        const data = await blockchain.sendToContract(
            this.host,
            contract,
            method,
            params,
            options
        );

        return this._response(data);
    }

    async events(){
        const host = this.payload.host;
        const contractName = this.payload.contract;
        const event = this.payload.event;
        const filter = this.payload.filter ?? {};

        const options = {filter: filter, fromBlock: 0, toBlock: 'latest'};
        const events = await blockchain.getPastEvents(
            host.replace('.point', ''),
            contractName,
            event,
            options
        );
        const eventData = [];
        for (const ev of events) {  
            //console.log(ev, ev.raw);
            const eventTimestamp = await blockchain.getBlockTimestamp(ev.blockNumber);
            console.log(ev.returnValues);
            eventData.push({
                data: ev.returnValues,
                timestamp: eventTimestamp
            });
        }

        return this._response(eventData);
    }
}

module.exports = ContractController;
