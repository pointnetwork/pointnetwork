const Model = require('../model');

class Identity extends Model {
    constructor(...args) {
        super(...args);
    }

    /*
     * Fields:
     * - id
     * - handle
     * - owner
     * - last_updated
     */

    static _buildIndices() {
        // this._addIndex('ul_status');
        // this._addIndex('dl_status');
    }
}

// Chunk.UPLOADING_STATUS_CREATED = 'us0';
// Chunk.UPLOADING_STATUS_UPLOADING = 'us1';
// Chunk.UPLOADING_STATUS_UPLOADED = 'us99';
// Chunk.DOWNLOADING_STATUS_CREATED = 'ds0';
// Chunk.DOWNLOADING_STATUS_DOWNLOADING = 'ds1';
// Chunk.DOWNLOADING_STATUS_DOWNLOADED = 'ds99';
// Chunk.DOWNLOADING_STATUS_FAILED = 'ds2';

module.exports = Identity;