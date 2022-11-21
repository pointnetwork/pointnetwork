const Web3 = require('web3');
const config = require('config');
const PointSDKController = require('./PointSDKController');
const _ = require('lodash');
const ethereum = require('../../network/providers/ethereum');
const {getJSON} = require('../../client/storage');
const {default: notifications} = require('../../notifications/notifications');

const GET_LOGS_BLOCK_RANGE = config.get('network.get_logs_block_range');

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
            host.replace(/\.point&/, ''),
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
            host.replace(/\.point$/, ''),
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

    async listEvents() {
        try {
            const host = this.req.params.identity;
            const identityContract = await ethereum.loadIdentityContract();
            const data = await identityContract.methods.getIkvList(host).call();

            if (!data || !Array.isArray(data) || data.length === 0) {
                return this._response([]);
            }

            const contractEvents = [];
            for (const ikvEntry of data) {
                if (ikvEntry.length > 2 && ikvEntry[1].startsWith('zweb/contracts/abi')) {
                    const abiStorageId = ikvEntry[2];
                    const jsonInterface = await getJSON(abiStorageId);
                    const {contractName, abi} = jsonInterface;
                    const events = abi.filter(i => i.type === 'event').map(e => e.name);
                    if (events.length > 0) {
                        contractEvents.push({contractName, events});
                    }
                }
            }

            return this._response(contractEvents);
        } catch (err) {
            this.reply.status(500);
            this._status(500)._response(err ?? 'Unable to find contract events');
        }
    }

    async getUnreadNotifications() {
        try {
            const unread = await notifications.loadUnread();
            return this._status(200)._response(unread);
        } catch (err) {
            this.reply.status(500);
            return this._status(500)._response(err.message ?? 'Unable to get unread notifications from database');
        }
    }

    async scanEventLogs() {
        try {
            let from;
            let to;
            let latest;

            if (!Number.isNaN(Number(this.req.query.from))) {
                from = Number(this.req.query.from);
            }
            if (!Number.isNaN(Number(this.req.query.to))) {
                to = Number(this.req.query.to);
            }
            if (from && !to) {
                to = from + GET_LOGS_BLOCK_RANGE;
            }
            if (!from) {
                const blocks = await notifications.getBlockRange();
                from = blocks.from;
                to = blocks.to;
            }

            if (!Number.isNaN(Number(this.req.query.latest))) {
                latest = Number(this.req.query.latest);
            } else {
                latest = await ethereum.getBlockNumber();
            }
            if (to > latest) {
                to = latest;
            }

            const logs = await notifications.loadUserSubscriptionsAndGetLogs(from, to);
            return this._status(200)._response({from, to, latest, logs});
        } catch (err) {
            this.reply.status(500);
            return this._status(500)._response(err.message ?? 'Unable to get event logs');
        }
    }

    async markRead() {
        try {
            const {id} = this.req.params;
            if (!id || Number.isNaN(Number(id))) {
                this.reply.status(400);
                return this._status(400)._response(`Invalid notificaiton id "${id}"`);
            }
            const affected = await notifications.markRead(id);
            if (affected === 0) {
                this.reply.status(404);
                return this._status(404)._response(`Notificaiton #"${id}" not found`);
            }
            return this._status(200)._response(`Marked notification #${id} as read`);
        } catch (err) {
            this.reply.status(500);
            return this._status(500)._response(err.message ?? 'Error marking notification as read');
        }
    }
}

module.exports = ContractController;
