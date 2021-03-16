const Socket = require('./Socket')

class DeployProgressSocket extends Socket {
  constructor(ctx, conn, wss) {
    super(ctx, conn, wss)
    this.ctx.client.deployerProgress.wss = this
  }
}

module.exports = DeployProgressSocket;