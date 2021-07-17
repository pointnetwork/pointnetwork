let events = require('events')
let path = require('path')

class DeployerProgress {
  static get PROGRESS_UPDATED() { return 'PROGRESS_UPDATED' }

  constructor(ctx) {
    this.ctx = ctx
    this.progressEventEmitter = new events.EventEmitter()
  }

  update(filename, progress = 0, status = 'UNKNOWN') {
    // forward this onto the event handler function
    this.progressEventEmitter.emit(DeployerProgress.PROGRESS_UPDATED, {filename, progress, status})
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