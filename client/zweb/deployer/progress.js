const events = require('events');
const path = require('path');

class DeployerProgress {
    static get PROGRESS_UPDATED() {
        return 'PROGRESS_UPDATED';
    }

    constructor(ctx) {
        this.ctx = ctx;
        this.progressEventEmitter = new events.EventEmitter();
    }

    update(filename, progress = 0, status = 'UNKNOWN') {
        // forward this onto the event handler function
        this.progressEventEmitter.emit(DeployerProgress.PROGRESS_UPDATED, {
            filename,
            progress,
            status
        });
    }

    // private functions
    _updateProgress(_filename, _progress, _status) {
        const inputs = this._formatInputs(_filename, _progress, _status);
        const existingRow = this._fetchExistingRow(inputs.filename);
        existingRow ? this._updateExistingRow(existingRow, inputs) : this._createNewRow(inputs);
    }

    _updateExistingRow(existingRow, inputs) {
        existingRow.progress = inputs.progress;
        existingRow.status = inputs.status;
    }

    _createNewRow(row) {
        this.progress.data.push(row);
    }

    _formatInputs(_filename, _progress, _status) {
        const filename = path.basename(_filename);
        const status = _status.toUpperCase();
        const progress = _progress;
        return {filename, progress, status};
    }

    _fetchExistingRow(filename) {
        return this.progress.data.find(row => row.filename === filename);
    }
}

module.exports = DeployerProgress;
