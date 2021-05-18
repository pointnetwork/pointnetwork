let events = require('events')
let path = require('path')

class DeployerProgress {
  constructor(ctx) {
    this.ctx = ctx
    this.PROGRESS_UPDATED = 'PROGRESS_UPDATED'
  }

  init() {
    this.progressEventEmitter = new events.EventEmitter()
    this._initEventHandlerFunction()
    this.progress = {
      type: 'api_deploy',
      data: []
    }
  }

  // this is set by the DeployProgressSocket once a connection is established with a client
  set wss(_wss) {
    this.wsserver = _wss
  }

  update(_filename, _progress = 0, _status = 'UNKNOWN') {
    // forward this onto the event handler function
    this.progressEventEmitter.emit(this.PROGRESS_UPDATED, _filename, _progress, _status)
  }

  _initEventHandlerFunction() {
    this.progressEventEmitter.on(this.PROGRESS_UPDATED, (filename, progress, status) => {
      if (this.wsserver) {
        this._updateProgress(filename, progress, status)
        this.wsserver.publishToClients(this.progress)
      }
    })
  }

  // private functions
  _updateProgress(_filename, _progress, _status) {
    let inputs = this._formatInputs(_filename, _progress, _status)
    let existingRow = this._fetchExisitngRow(inputs.filename)
    existingRow ? this._updateExistingRow(existingRow, inputs) : this._createNewRow(inputs)
  }

  _updateExistingRow(existingRow, inputs) {
    existingRow.progress = inputs.progress
    existingRow.status = inputs.status
  }

  _createNewRow(row) {
    this.progress.data.push(row)
  }

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