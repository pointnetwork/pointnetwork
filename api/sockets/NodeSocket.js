const Socket = require('./Socket')

class NodeSocket extends Socket {
  constructor(ctx, conn, wss) {
    super(ctx, conn, wss)
    // wire up sockets to data streams
    this.ctx.client.deployerProgress.wss = this
    this.ctx.wallet.wss = this
  }
}

module.exports = NodeSocket;