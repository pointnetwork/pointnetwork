const Socket = require('./Socket')

class NodeSocket extends Socket {
  constructor(ctx, conn, wss) {
    super(ctx, conn, wss)
  }
}

module.exports = NodeSocket;