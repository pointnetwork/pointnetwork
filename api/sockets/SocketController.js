const WebSocket = require('ws');
const Console = require('../../console');

class SocketController {
  constructor(ctx, conn, wss) {
    this.ctx = ctx
    this.conn = conn
    this.ws = conn.socket
    this.wss = wss
    this.init()
  }

  init() {
    this.console = new Console(this.ctx);
     // expect the message to contain an object detailing the
    this.ws.on('message', async (msg) => {
      // TODO extract to handleRequesst function
      const cmd = JSON.parse(msg)
      // TODO handle unsubscribe?
      // TODO ensure only one subscription per client?
      if(cmd.type == 'subscribeContractEvent') {
          const {target, contract, event, ...options} = cmd.params;
          this.ctx.web3bridge.subscribeEvent(target,
                                             contract,
                                             event,
                                             this.callback.bind(this),
                                             options);
          this.publishToClients(`successfully subscribed to ${cmd.params.contract} contract ${cmd.params.event} events`);
      }
      if(cmd.type == 'api') {
          this.publishToClients(await this.apiResponseFor(cmd.params.path))
      }
      if(cmd.type == 'internal') {
          if(cmd.params.service == 'wallet') {
            this.ctx.wallet.wss = this
            this.publishToClients(`successfully subscribed to all internal wallet transactions`);
          }
          if(cmd.params.service == 'deployer') {
            this.ctx.client.deployerProgress.wss = this
            this.publishToClients(`successfully subscribed to all internal deployer progress updates`);
          }
      }
    })
  }

  callback(event) {
    // TODO callback should be generic and not know about the object passed in
    this.publishToClients(event.returnValues);
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

module.exports = SocketController;