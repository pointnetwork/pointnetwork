const WebSocket = require('ws');
const Console = require('../../console');

// TODO change to SocketController
class Socket {
  constructor(ctx, conn, wss) {
    this.ctx = ctx
    this.conn = conn
    this.ws = conn.socket
    this.wss = wss
    this.init()
  }

  /*
  Refactor Socket to work with cmd objects of a specific structure to call API endpoints

  * If type == 'subscribeContractEvent' then subscribe to the contracts events
  * If type == 'api' then make API Request via contoller
  * If type == 'internal' then set the via the wss endpoint of internal streamss like deployer / wallet

  */
  init() {
    this.console = new Console(this.ctx);
     // expect the message to contain an object detailing the
    this.ws.on('message', async (msg) => {
      // TODO extract to handleRequesst function
      console.log('received msg: ', msg)
      // contract and the contract event to subscribe to
      const cmd = JSON.parse(msg)
      console.log('received cmd: ', cmd)
      // TODO remove hardcoded target
      const target = 'hello.z'
      const options = {}
      // TODO improve this process and fix multiple subscritons
      // TODO unsubscribe?
      // TODO ensure only one subscription?
      if(cmd.type == 'subscribeContractEvent') {
          console.log('Subscribing to: ', cmd.params.contract)
          this.ctx.web3bridge.subscribeEvent(target, cmd.params.contract, cmd.params.event, this.callback.bind(this), options);
          this.publishToClients(`successfully subscribed to ${cmd.params.contract} contract ${cmd.params.event} events`);
      }
      //{"type":"api","params":{"path":"status/ping"}}
      if(cmd.type == 'api') {
          this.publishToClients(await this.apiResponseFor(cmd.params.path))
      }
      // {"type":"internal","params":{"service":"wallet"}}
      if(cmd.type == 'internal') {
          this.ctx.wallet.wss = this
          this.publishToClients(`successfully subscribed to all internal wallet transactions`);
          // this.ctx.client.deployerProgress.wss = this
      }
    })
  }

  callback(event) {
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

module.exports = Socket;