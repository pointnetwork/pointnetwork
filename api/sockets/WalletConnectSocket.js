const Socket = require('./Socket')

class WalletConnectSocket extends Socket {
  constructor(ctx, conn, wss) {
    super(ctx, conn, wss)
    this.ctx.wallet.wss = this
  }
}

module.exports = WalletConnectSocket;