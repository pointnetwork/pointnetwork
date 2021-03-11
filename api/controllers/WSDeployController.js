class WSDeployController {
  constructor(ctx, conn) {
    this.ctx = ctx;
    this.conn = conn;
    this.deployerProgress = require('../../client/zweb/deployer/progress')
    this.deployerProgress.setSocket(this.conn.socket)
  }
  progress() {
    // this.conn.setEncoding('utf8')
    // connection.socket.send('hi from server')
    // this.conn.socket.send('hello from WSDeployController!!')
    // this.deployerProgress.pubSocket()
    // this.conn.once('data', chunk => {
    //   this.conn.end()
    // })
    // return this.deployerProgress.getProgressForDeployment()
  }
}

module.exports = WSDeployController;