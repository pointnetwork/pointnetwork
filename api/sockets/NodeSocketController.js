const WebSocket = require('ws');
const Wallet = require('../../wallet/index')
const Console = require('../../console');

/*
The NodeSocketController is for handling internal node websocket connections via the internal node api port and is currently used by the Fastify Websocket connection (see ws_routes.js).
*/
class NodeSocketController {
    constructor(_ctx, _ws, _wss) {
        this.ctx = _ctx
        this.ws = _ws;
        this.wss = _wss;
        this.init();
    }

    init() {
        this.console = new Console(this.ctx);
        // expect the message to contain an object detailing the
        this.ws.on('message', async (msg) => {
        // TODO extract to handleRequesst function
        const cmd = JSON.parse(msg);
        switch (cmd.type) {
            case 'api':
                this.publishToClients(await this.apiResponseFor(cmd));
                break;
            case 'walletSubscription':
                // subscribe to the wallets TRANSACTION_EVENT via the wallet transactionEventEmitter
                this.ctx.wallet.transactionEventEmitter.on(Wallet.TRANSACTION_EVENT, (data) => {
                    this.publishToClients(this._formatResponse(cmd, data));
                })
                this.publishToClients(`successfully subscribed to all internal wallet transactions`);
                break;
            case 'deployerSubscription':
                this.ctx.client.deployerProgress.wss = this
                this.publishToClients(`successfully subscribed to all internal deployer progress updates`);
                break;
            }
        })
    }

    publishToClients(msg) {
        if(this.wss) {
            this.wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(msg));
                }
            });
        }
    }

    async apiResponseFor(cmdObj) {
        let [cmd, params] = this._parseCmd(cmdObj.params.path)
        let response = await this.console.cmd_api(cmd, ...params)
        return this._formatResponse(cmdObj, response)
    }

    _formatResponse(cmd, response) {
        let payload = {...cmd, data: response}
        return payload
    }

    _parseCmd(cmdstr) {
        let [cmd, params] = cmdstr.split('?')
        params ? params = params.split('&') : params = ''
        return [cmd, params]
    }
}

module.exports = NodeSocketController;