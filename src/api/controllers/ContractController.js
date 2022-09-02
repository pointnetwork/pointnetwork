const Web3 = require('web3');
const config = require('config');
const PointSDKController = require('./PointSDKController');
const _ = require('lodash');
const ethereum = require('../../network/providers/ethereum');

class ContractController extends PointSDKController {
    constructor(req, reply) {
        super(req);
        this.req = req;
        this.host = this.req.headers.host;
        // TODO: also verify the domain is registered in the Identity contract
        if (!_.endsWith(this.host, '.point') && !this.host === 'point') return reply.callNotFound();

        this.payload = req.body;
        this.reply = reply;
    }

    async safeCall() {
        const contractName = this.payload.contract;
        const methodName = this.payload.method;
        const params = this.payload.params ? this.payload.params : [];
        const host = this.host;

        const contract = await ethereum.loadWebsiteContract(host, contractName);

        const method = contract.options.jsonInterface.find(m => m.name === methodName);
        if (!method) {
            this.reply.status(400).send('No such method');
            return;
        }
        if (!['view', 'pure'].includes(method.stateMutability)) {
            this.reply.status(403).send('Only view and pure method calls are alowed');
            return;
        }

        const data = await ethereum.callContract(host, contractName, methodName, params);

        return this._response(data);
    }

    async load() {
        const contractName = this.req.params.contract;

        const contract = await ethereum.loadWebsiteContract(this.req.identity, contractName);

        const data = {
            address: contract._address,
            abi: contract._jsonInterface
        };

        return this._response(data);
    }

    async normalizeEvents(events, addTimestamp) {
        const eventData = [];
        for (const ev of events) {
            const {blockNumber, returnValues} = ev;
            const timestamp = addTimestamp ? await ethereum.getBlockTimestamp(blockNumber) : null;
            eventData.push({data: returnValues, blockNumber, timestamp});
        }
        return eventData;
    }

    async handleEvents({host, contract, event, addTimestamp, filter, fromBlock, toBlock}) {
        const options = {filter, fromBlock, toBlock};
        const events = await ethereum.getPastEvents(
            host.replace('.point', ''),
            contract,
            event,
            options
        );

        const eventData = await this.normalizeEvents(events, addTimestamp);
        return eventData;
    }

    async handlePaginatedEvents({host, contract, event, addTimestamp, filter, cursor}) {
        const PAGE_SIZE = config.get('network.event_block_page_size');

        // `from: 0, to: 0` does not work, so, as an exception, if the query is `from: 1, to: N`,
        // we'll change it to `from: 0, to: N`.
        const from = cursor - PAGE_SIZE <= 1 ? 0 : cursor - PAGE_SIZE;

        const events = await ethereum.getPaginatedPastEvents(
            host.replace('.point', ''),
            contract,
            event,
            {filter, fromBlock: from, toBlock: cursor}
        );

        const eventData = await this.normalizeEvents(events, addTimestamp);
        const pagination = {
            from,
            to: cursor,
            nextCursor: from > 0 ? from - 1 : null
        };

        return {events: eventData, pagination};
    }

    async events() {
        const {host, contract, event} = this.payload;
        const filter = this.payload.filter ?? {};

        let addTimestamp = false;
        if (filter.addTimestamp) {
            delete filter.addTimestamp;
            addTimestamp = true;
        }

        if (filter.cursor) {
            // Handle the request with pagination, don't collect all events at once,
            // instead attach pagination information to the response and let clients make
            // further requests.
            const cursor =
                filter.cursor === 'latest' ? await ethereum.getBlockNumber() : filter.cursor;

            delete filter.cursor;

            const data = await this.handlePaginatedEvents({
                host,
                contract,
                event,
                addTimestamp,
                filter,
                cursor
            });

            return this._response(data);
        }

        // Collect all events at once and send them all toghether in a single response.
        // The requests to blockchain are themselves paginated, but there's a single
        // HTTP request/response roundtrip.
        const fromBlock = this.payload.fromBlock ?? 0;
        const toBlock = this.payload.toBlock ?? 'latest';
        const data = await this.handleEvents({
            host,
            contract,
            event,
            addTimestamp,
            filter,
            fromBlock,
            toBlock
        });

        return this._response(data);
    }

    async encodeFunctionCall() {
        const {jsonInterface, params} = this.payload;

        const web3 = new Web3();
        return this._response(web3.eth.abi.encodeFunctionCall(jsonInterface, params));
    }

    async decodeParameters() {
        const {typesArray, hexString} = this.payload;

        const web3 = new Web3();
        return this._response(web3.eth.abi.decodeParameters(typesArray, hexString));
    }
}

module.exports = ContractController;
