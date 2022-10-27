const PointSDKController = require('./PointSDKController');
const File = require('../../db/models/file').default;
const DEFAULT_ENCODING = 'utf-8';
const {getFile, uploadFile} = require('../../client/storage');
const config = require('config');
const detectContentType = require('detect-content-type');

class StorageController extends PointSDKController {
    constructor(req) {
        super(req);

        this.req = req;
        this.config = config.get('zproxy');

        this.payload = req.body;
    }

    async getString() {
        const cid = this.req.params.id;
        const encoding = this.req.query.encoding ?? DEFAULT_ENCODING;

        const contents = (await getFile(cid, encoding)).toString(encoding);
        const contentType = detectContentType(Buffer.from(contents));
        return this._response(contents, {'content-type': contentType});
    }

    async putString() {
        const data = this.payload.data;
        if (data) {
            const id = await uploadFile(data);
            return this._response(id);
        } else {
            return this._response(null);
        }
    }

    // Returns a single file metadata stored in the nodes leveldb
    async fileById() {
        const id = this.req.params.id;
        const file = await File.findOrFail(id);
        return this._response(file);
    }
}

module.exports = StorageController;
