const WebSocket = require('ws');
const Console = require('../../console');

class DeployProgressSocket {
  constructor(ctx, conn, wss) {
    this.ctx = ctx;
    this.ws = conn.socket;
    this.wss = wss;
    this.ctx.client.deployerProgress.wss = this
    this.init()
  }

  init() {
    this.console = new Console();
    this.ws.on('message', async (message) => {
      this.publishToClients(await this.responseFor(message))
    })
  }

  publishToClients(progress) {
    if(this.wss) {
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(progress));
        }
      });
    }
  }

  async responseFor(message) {
    return await this.console.cmd_api(`api/${message}`)
  }
}

module.exports = DeployProgressSocket;