// {
//   type: 'request_deployment-progress',
//   data: [{
//     filename: 'example/hello.z/views/index.html',
//     progress: 100,
//     status: 'STORED'
//   },
//   {
//     filename: 'example/hello.z/routes.json',
//     progress: 40,
//     status: 'PARSING'
//   }]
// }

events = require('events')

class DeployerProgress {
  constructor(ctx) {
    this.ctx = ctx
    this.STATE_UPDATED = 'STATE_UPDATED'
    this.socket
  }

  init() {
    this.progressEventEmitter = new events.EventEmitter()
    this.progressEventEmitter.on(this.STATE_UPDATED, () => {
      this._publishToSocket()
    })
    this.progress = {
      state: []
    }
  }

  setSocket(_socket){
    this.socket = _socket
    this.socket.send(JSON.stringify(this.progress))
  }

  update(state) {
    this.progress.state.push(state)
    this.progressEventEmitter.emit(this.STATE_UPDATED)
  }

  _publishToSocket() {
    if(this.socket) this.socket.send(JSON.stringify(this.progress))
  }
}

module.exports = DeployerProgress