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
            // TODO extract to handleRequesst function
            const cmd = JSON.parse(msg.utf8Data);
            // TODO ensure only one subscription per client?
            switch (cmd.type) {
                case 'subscribeContractEvent':
                  const {contract, event, ...options} = cmd.params;
                  this.ctx.web3bridge.subscribeEvent(this.target,
                                                      contract,
                                                      event,
                                                      this.publishToClients.bind(this),
                                                      options);
                  this.publishToClients(`successfully subscribed to ${cmd.params.contract} contract ${cmd.params.event} events`);
                  break;
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
}

module.exports = ZProxySocketController;