class DeployProgressSocket {
  constructor(ctx, conn) {
    this.ctx = ctx;
    this.conn = conn;
    this.ctx.client.deployerProgress.setSocket(this.conn.socket)
    this.socket_status = {
      type: 'socket_status',
      status: 'Running'
    }
    this.init()
  }

  init() {
    this.conn.socket.on('message', message => {
      this.conn.socket.send(JSON.stringify(this.responseFor(message)))
    })
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