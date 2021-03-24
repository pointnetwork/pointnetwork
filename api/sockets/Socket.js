const WebSocket = require('ws');
const Console = require('../../console');

class Socket {
  constructor(ctx, conn, wss) {
    this.ctx = ctx
    this.conn = conn
    this.ws = conn.socket
    this.wss = wss
    this.init()
  }

  init() {
    this.console = new Console(this.ctx);
    this.ws.on('message', async (cmd) => {
      this.publishToClients(await this.responseFor(cmd))
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

  async responseFor(cmdstr) {
    let [cmd, params] = this._parseCmd(cmdstr)
    let response = await this.console.cmd_api(cmd, ...params)
    return this._formatResponse(response)
  }

  _formatResponse(response) {
    let payload = {data: response}
    return payload
  }

  _parseCmd(cmdstr) {
    let [cmd, params] = cmdstr.split('?')
    params ? params = params.split('&') : params = ''
    return [cmd, params]
  }
}

module.exports = Socket;