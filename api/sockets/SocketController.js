const WebSocket = require('ws');
const Console = require('../../console');

class SocketController {
  constructor(_ctx, _ws, _wss, _host) {
    this.ctx = _ctx
    this.ws = _ws;
    this.wss = _wss;
    this.target = _host;
    this.init();
  }

  init() {
    this.console = new Console(this.ctx);
     // expect the message to contain an object detailing the
    this.ws.on('message', async (msg) => {
      // TODO extract to handleRequesst function
      let payload = msg.utf8Data ? msg.utf8Data : msg;
      const cmd = JSON.parse(payload);
      // TODO ensure only one subscription per client?
      switch (cmd.type) {
        case 'subscribeContractEvent':
          const {contract, event, ...options} = cmd.params;
          this.ctx.web3bridge.subscribeEvent(this.target,
                                              contract,
                                              event,
                                              this.publishToClientsWebSocketServer.bind(this),
                                              options);
          this.publishToClientsWebSocketServer(`successfully subscribed to ${cmd.params.contract} contract ${cmd.params.event} events`);
          break;
        case 'api':
          this.publishToClientsFastify(await this.apiResponseFor(cmd.params.path));
          break;
        case 'internal':
          if(cmd.params.service == 'wallet') {
            this.ctx.wallet.wss = this
            this.publishToClientsFastify(`successfully subscribed to all internal wallet transactions`);
          }
          if(cmd.params.service == 'deployer') {
            this.ctx.client.deployerProgress.wss = this
            this.publishToClientsFastify(`successfully subscribed to all internal deployer progress updates`);
          }
          break;
      }
    })
  }

  publishToClientsWebSocketServer(msg) {
    if(this.wss) {
      this.wss.connections.forEach((client) => {
        if (client.state === 'open') {
          client.send(JSON.stringify(msg));
        }
      });
    }
  }






  publishToClientsFastify(msg) {
    if(this.wss) {
      this.wss.clients.forEach((client) => {
        if (client.state === WebSocket.OPEN) {
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

module.exports = SocketController;