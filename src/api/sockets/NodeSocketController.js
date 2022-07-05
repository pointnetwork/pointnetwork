const WebSocket = require('ws');
const Console = require('../../console');
const logger = require('../../core/log');
const log = logger.child({module: 'NodeSocketController'});

/*
The NodeSocketController is for handling internal node websocket connections via the internal node api port and is currently used by the Fastify Websocket connection (see ws_routes.js).
*/
class NodeSocketController {
    constructor(_ws, _wss) {
        this.ws = _ws;
        this.wss = _wss;
        this.init();
    }

    init() {
        this.console = new Console();
        // expect the message to contain an object detailing the
        this.ws.on('message', async msg => {
            const cmd = JSON.parse(msg);
            switch (cmd.type) {
                case 'api':
                    this.publishToClients(await this.apiResponseFor(cmd));
                    break;
                // TODO: restore and reimplement if needed
                // case 'walletSubscription':
                //     // subscribe to the wallets TRANSACTION_EVENT via the wallet transactionEventEmitter
                //     this.ctx.wallet.transactionEventEmitter.on(Wallet.TRANSACTION_EVENT, data => {
                //         this.publishToClients(this._formatResponse(cmd, data));
                //     });
                //     this.publishToClients(
                //         this._formatResponse(
                //             cmd,
                //             {message: 'Subscribed to Wallet.TRANSACTION_EVENT'},
                //             'SUBSCRIBED_EVENT'
                //         )
                //     );
                //     break;
            }
        });

        this.ws.on('error', err => {
            log.error(err, 'Error from NodeSocketController');
        });
    }

    publishToClients(msg) {
        if (this.wss) {
            this.wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(msg));
                }
            });
        }
    }

    async apiResponseFor(cmdObj) {
        const [cmd, params] = this._parseCmd(cmdObj.params.path);
        const response = await this.console.cmd_api(cmd, ...params);
        return this._formatResponse(cmdObj, response);
    }

    _formatResponse(cmd, response, event = 'DATA_EVENT') {
        const payload = {...cmd, data: response, event};
        return payload;
    }

    _parseCmd(cmdstr) {
        let [cmd, params] = cmdstr.split('?');
        if (params) {
            params = params.split('&');
        } else {
            params = '';
        }
        return [cmd, params];
    }
}

module.exports = NodeSocketController;
