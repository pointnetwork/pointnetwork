/*
The ZProxySocketController is for handling ZApp websocket connections via the ZProxy API port.
See client/proxy/index.js for usage details of ZProxy and setup of the WebSocketServer instance.
*/
const logger = require('../../core/log');
const log = logger.child({module: 'ZProxySocketController'});
const blockchain = require('../../network/blockchain');

const SUBSCRIPTION_EVENT_TYPES = {
    CONFIRMATION: 'subscription_confirmation',
    CANCELLATION: 'subscription_cancellation',
    EVENT: 'subscription_event',
    ERROR: 'subscription_error'
};

const SUBSCRIPTION_REQUEST_TYPES = {
    SUBSCRIBE: 'subscribeContractEvent',
    UNSUBSCRIBE: 'removeSubscriptionById'
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
        this.ws.on('message', async ({utf8Data}) => {
            const {hostname} = this;
            const request = {
                ...JSON.parse(utf8Data),
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
            this.wss.connections.forEach(client => {
                if (client.state === 'open') {
                    client.send(JSON.stringify(msg));
                }
            });
        }
    }

    pushSubscriptionEvent({type, subscriptionId, request, data}) {
        log.info({type, subscriptionId, request, data}, 'Pushing subscription event');

        return this.pushToClients({type, subscriptionId, request, data});
    }
}

module.exports = ZProxySocketController;
