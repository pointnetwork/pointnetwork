const WebSocket = require('ws')

class DeployProgressSocket {
  constructor(ctx, conn, wss) {
    this.ctx = ctx;
    this.ws = conn.socket;
    this.wss = wss;
    this.ctx.client.deployerProgress.wss = this
    this.socket_status = {
      type: 'socket_status',
      status: 'Running'
    }
    this.init()
  }

  init() {
    this.ws.on('message', message => {
      this.publishToClients(this.responseFor(message))
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

  responseFor(message) {
    switch (message) {
      case 'status':
        return this.socket_status
      case 'ping':
        return {type: 'message', value: 'pong'}
      default:
        break;
    }
  }
}

module.exports = DeployProgressSocket;