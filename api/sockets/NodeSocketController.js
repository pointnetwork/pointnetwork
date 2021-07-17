const WebSocket = require('ws');
const Console = require('../../console');

/*
The  NodeSocketController is for handling internal node websocket connections via the internal node api port and is currently used by the Fastify Websocket connection (see ws_routes.js).
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
                this.publishToClients(await this.apiResponseFor(cmd.params.path));
                break;
            case 'walletSubscription':
                this.ctx.wallet.wss = this
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

    async apiResponseFor(cmdstr) {
        let [cmd, params] = this._parseCmd(cmdstr)
        let response = await this.console.cmd_api(cmd, ...params)
        return this._formatResponse(cmd, response)
    }

    _formatResponse(cmd, response) {
        let api_cmd = `api_${cmd.replace('/', '_')}`
        let payload = {type: api_cmd, data: response}
        return payload
    }

    _parseCmd(cmdstr) {
        let [cmd, params] = cmdstr.split('?')
        params ? params = params.split('&') : params = ''
        return [cmd, params]
    }
}

module.exports = NodeSocketController;