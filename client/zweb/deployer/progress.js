let events = require('events')
let path = require('path')

class DeployerProgress {
  constructor(ctx) {
    this.ctx = ctx
    this.PROGRESS_UPDATED = 'PROGRESS_UPDATED'
  }

  init() {
    this.progressEventEmitter = new events.EventEmitter()
    this.progressEventEmitter.on(this.PROGRESS_UPDATED, () => {
      if (this.wsserver) this.wsserver.publishToClients(this.progress)
    })
    this.progress = {
      type: 'request_deployment-progress',
      data: []
    }
  }

  // this is set by the DeployProgressSocket once a connection is established with a client
  set wss(_wss) {
    this.wsserver = _wss
    this.progressEventEmitter.emit(this.PROGRESS_UPDATED)
  }

  update(_filename, _progress = 0, _status = 'UNKNOWN') {
    let inputs = this._formatInputs(_filename, _progress, _status)
    let existingRow = this._fetchExisitngRow(inputs.filename)
    if(existingRow) {
      existingRow.progress = inputs.progress
      existingRow.status = inputs.status
    } else {
      this.progress.data.push(inputs)
    }
    this.progressEventEmitter.emit(this.PROGRESS_UPDATED)
  }

  // private functions
  _formatInputs(_filename, _progress, _status) {
    let filename = path.basename(_filename)
    let status = _status.toUpperCase()
    let progress = _progress
    return {filename, progress, status}
  }

  _fetchExisitngRow(filename) {
    return this.progress.data.find(row => row.filename === filename)
  }
}

module.exports = DeployerProgress