/*
The ZProxySocketController is for handling ZApp websocket connections via the ZProxy API port.
See client/proxy/index.js for usage details of ZProxy and setup of the WebSocketServer instance.
*/
class ZProxySocketController {
    constructor(_ctx, _ws, _wss, _host) {
        this.ctx = _ctx
        this.ws = _ws;
        this.wss = _wss;
        this.target = _host;
        this.init();
    }

    init() {
        this.ws.on('message', async (msg) => {
            const cmd = JSON.parse(msg.utf8Data);
            // add the target to the cmd object to be echoed back via the callback closure
            cmd.hostname = this.target;
            function callbackData(data) {
                this.publishToClients(this._formatResponse(cmd, data));
            }
            function callbackSubscribed(subscriptionId) {
                const { contract, event } = cmd.params;
                const payload = {
                    subscriptionId,
                    message: `Subscribed to ${contract} contract ${event} events with subscription id ${subscriptionId}`
                }
                this.publishToClients(this._formatResponse(cmd, payload, 'SUBSCRIBED_EVENT'));
            }
            switch (cmd.type) {
                case 'subscribeContractEvent':
                    const {contract, event, ...options} = cmd.params;
                    const subscription = await this.ctx.web3bridge.subscribeContractEvent(this.target,
                                                        contract,
                                                        event,
                                                        callbackData.bind(this),
                                                        callbackSubscribed.bind(this),
                                                        options);
                    break;
                case 'removeSubscriptionById':
                    const { contract, event, subscriptionId } = cmd.params;
                    const payload = {
                        message: `Unsubscribed from ${contract} contract ${event} events using subscription id ${subscriptionId}`
                    }
                    await this.ctx.web3bridge.removeSubscriptionById(subscriptionId);
                    this.publishToClients(this._formatResponse(cmd, payload, 'UNSUBSCRIBED_EVENT'));
            }
        })
    }

    publishToClients(msg) {
        if(this.wss) {
            this.wss.connections.forEach((client) => {
                if (client.state === 'open') {
                    client.send(JSON.stringify(msg));
                }
            });
        }
    }

    _formatResponse(cmd, response, event='DATA_EVENT') {
        let payload = {...cmd, data: response, event}
        return payload
    }
}

module.exports = ZProxySocketController;