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
            switch (cmd.type) {
                case 'subscribeContractEvent':
                    this.cmd = cmd;
                    const {contract, event, ...options} = cmd.params;
                    this.ctx.web3bridge.subscribeEvent(this.target,
                                                        contract,
                                                        event,
                                                        this.callback.bind(this),
                                                        options);
                    // Notify the clients that we are subscribed to this contract event
                    this.publishToClients(this._formatResponse(cmd, {message: `Subscribed to ${cmd.params.contract} contract ${cmd.params.event} events`}, 'SUBSCRIBED_EVENT'));
                    break;
            }
        })
    }

    callback(data) {
        this.publishToClients(this._formatResponse(this.cmd, data));
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