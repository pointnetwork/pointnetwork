/*
The ZProxySocketController is for handling ZApp websocket connections via the ZProxy API port.
See client/proxy/index.js for usage details of ZProxy and setup of the WebSocketServer instance.
*/
import ethereum from '../../network/providers/ethereum';
import handleRPC from '../../rpc/rpc-handlers';
import logger from '../../core/log';
import {verify} from 'jsonwebtoken';
import {getSecretToken} from '../../util';
const log = logger.child({module: 'ZProxySocketController'});

export const SUBSCRIPTION_EVENT_TYPES = {
    CONFIRMATION: 'subscription_confirmation',
    CANCELLATION: 'subscription_cancellation',
    EVENT: 'subscription_event',
    ERROR: 'subscription_error',
    RPC: 'rpc_method_response'
};

export const SUBSCRIPTION_REQUEST_TYPES = {
    SUBSCRIBE: 'subscribeContractEvent',
    UNSUBSCRIBE: 'removeSubscriptionById',
    RPC: 'rpc'
};

let secretToken = '';

class ZProxySocketController {
    constructor(_ws, _wss, _hostname) {
        this.ws = _ws;
        this.wss = _wss;
        this.hostname = _hostname;
        this.init();
    }

    init() {
        this.ws.on('message', async msg => {
            const {hostname} = this;
            const request = JSON.parse(msg);

            if (!secretToken) {
                secretToken = await getSecretToken();
            }
            const token = request.__point_token;
            if (!token) {
                return this.pushToClient({error: 'Missing auth token'});
            }
            try {
                verify(token, secretToken);
            } catch (e) {
                return this.pushToClient({error: 'Bad auth token'});
            }

            switch (request.type) {
                case SUBSCRIPTION_REQUEST_TYPES.SUBSCRIBE: {
                    const {contract, event, ...options} = request.params;
                    const {CONFIRMATION, EVENT} = SUBSCRIPTION_EVENT_TYPES;

                    return ethereum.subscribeContractEvent(
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

                    return ethereum.removeSubscriptionById(subscriptionId, event =>
                        this.pushSubscriptionEvent({...event, request, type: CANCELLATION})
                    );
                }

                case SUBSCRIPTION_REQUEST_TYPES.RPC: {
                    const {method, params, id, network, __hostname, meta} = request;

                    const {status, result} = await handleRPC({
                        method,
                        params,
                        id,
                        network,
                        target: __hostname,
                        contract: meta ? meta.contract : ''
                    });

                    return this.pushRPCMessage({
                        request,
                        subscriptionId: null,
                        type: SUBSCRIPTION_EVENT_TYPES.RPC,
                        data: result,
                        status
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

    pushToClient(msg) {
        if (this.ws && this.ws.readyState === 1) {
            this.ws.send(JSON.stringify(msg));
        }
    }

    pushRPCMessage({type, subscriptionId, ...msg}) {
        log.trace({type, subscriptionId}, 'Pushing RPC message');
        return this.pushToClient({type, subscriptionId, ...msg});
    }

    pushSubscriptionEvent({type, subscriptionId, ...msg}) {
        log.trace({type, subscriptionId}, 'Pushing subscription event');

        return this.pushToClient({type, subscriptionId, ...msg});
    }
}

export default ZProxySocketController;
