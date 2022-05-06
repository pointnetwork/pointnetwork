/*
The ZProxySocketController is for handling ZApp websocket connections via the ZProxy API port.
See client/proxy/index.js for usage details of ZProxy and setup of the WebSocketServer instance.
*/
const logger = require('../../core/log');
const log = logger.child({module: 'ZProxySocketController'});
const blockchain = require('../../network/providers/ethereum');
const handleRPC = require('../../rpc/rpc-handlers').default;

const SUBSCRIPTION_EVENT_TYPES = {
    CONFIRMATION: 'subscription_confirmation',
    CANCELLATION: 'subscription_cancellation',
    EVENT: 'subscription_event',
    ERROR: 'subscription_error',
    RPC: 'rpc_method_response'
};

const SUBSCRIPTION_REQUEST_TYPES = {
    SUBSCRIBE: 'subscribeContractEvent',
    UNSUBSCRIBE: 'removeSubscriptionById',
    RPC: 'rpc'
};

class ZProxySocketController {
    constructor(_ctx, _ws, _wss, _hostname) {
        this.ctx = _ctx;
        this.ws = _ws;
        this.wss = _wss;
        this.hostname = _hostname;
        this.init();
    }

    init() {
        this.ws.on('message', async msg => {
            const {hostname} = this;
            const request = {
                ...JSON.parse(msg),
                hostname // add the hostname to the `request` object to be echoed back via the callback closure
            };

            switch (request.type) {
                case SUBSCRIPTION_REQUEST_TYPES.SUBSCRIBE: {
                    const {contract, event, ...options} = request.params;
                    const {CONFIRMATION, EVENT} = SUBSCRIPTION_EVENT_TYPES;

                    return blockchain.subscribeContractEvent(
                        hostname,
                        contract,
                        event,
                        event => this.pushSubscriptionEvent({...event, request, type: EVENT}),
                        event =>
                            this.pushSubscriptionEvent({...event, request, type: CONFIRMATION}),
                        options
                    );
                }

                case SUBSCRIPTION_REQUEST_TYPES.UNSUBSCRIBE: {
                    const {subscriptionId} = request.params;
                    const {CANCELLATION} = SUBSCRIPTION_EVENT_TYPES;

                    return blockchain.removeSubscriptionById(subscriptionId, event =>
                        this.pushSubscriptionEvent({...event, request, type: CANCELLATION})
                    );
                }

                case SUBSCRIPTION_REQUEST_TYPES.RPC: {
                    const {method, params, id, network} = request;
                    const {result} = await handleRPC({method, params, id, network});
                    return this.pushRPCMessage({
                        request,
                        subscriptionId: null,
                        type: SUBSCRIPTION_EVENT_TYPES.RPC,
                        data: result
                    });
                }

                default: {
                    return this.pushSubscriptionEvent({
                        request,
                        subscriptionId: null,
                        type: SUBSCRIPTION_EVENT_TYPES.ERROR,
                        data: {message: `Unsupported subscription type "${request.type}"`}
                    });
                }
            }
        });

        this.ws.on('error', err => {
            log.error(err, 'Error from ZProxySocketController');
        });
    }

    pushToClients(msg) {
        if (this.wss) {
            this.wss.clients.forEach(client => {
                if (client.readyState === 1) {
                    client.send(JSON.stringify(msg));
                }
            });
        }
    }

    pushToSender(msg) {
        if (this.ws) {
            this.ws.send(JSON.stringify(msg));
        }
    }

    pushRPCMessage(msg) {
        log.info(msg, 'Pushing RPC message');
        return this.pushToSender(msg);
    }

    pushSubscriptionEvent({type, subscriptionId, request, data}) {
        log.info({type, subscriptionId, request, data}, 'Pushing subscription event');

        return this.pushToClients({type, subscriptionId, request, data});
    }
}

module.exports = ZProxySocketController;
