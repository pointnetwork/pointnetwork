events = require('events')

class DeployerProgress {
  constructor(ctx) {
    this.ctx = ctx
    this.STATE_UPDATED = 'STATE_UPDATED'
  }

  init() {
    this.progressEventEmitter = new events.EventEmitter()
    this.progressEventEmitter.on(this.STATE_UPDATED, () => {
      this._publishToSocket()
    })
    this.progress = {
      type: 'request_deployment-progress',
      data: []
    }
  }

  // this is set by the DeployProgressSocket once a connection is established with a client
  set socket(ws){
    this.ws = ws
    this.ws.send(JSON.stringify(this.progress))
  }

  update(filename, progress = 0, status = 'UNKNOWN') {
    status = status.toUpperCase()
    let existingRow = this.fetchExisitngRow(filename)
    if(existingRow) {
      existingRow.progress = progress
      existingRow.status = status
    } else {
      this.progress.data.push({filename, progress, status})
    }
    this.progressEventEmitter.emit(this.STATE_UPDATED)
  }

  fetchExisitngRow(filename) {
    return this.progress.data.find(row => row.filename === filename)
  }

  _publishToSocket() {
    if(this.ws) this.ws.send(JSON.stringify(this.progress))
  }
}

module.exports = DeployerProgress