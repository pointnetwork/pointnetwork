const PointSDKController = require('./PointSDKController');
const File = require('../../db/models/file');
const Chunk = require('../../db/models/chunk');
const DEFAULT_ENCODING = 'utf-8';
const {getFile, uploadFile, DOWNLOAD_STATUS} = require("../../client/storage/index-new.js");

class StorageController extends PointSDKController {
    constructor(ctx, req) {
        super(ctx);

        this.req = req;
        this.config = ctx.config.client.zproxy;

        this.payload = req.body;
    }

    async getString() {
        const cid = this.req.params.id;
        const encoding = this.req.query.encoding ?? DEFAULT_ENCODING;

        const contents = (await getFile(cid, encoding)).toString(encoding);
        return this._response(contents);
    }

    async putString() {
        let data = this.payload.data;
        if(data) {
            const id = await uploadFile(data);
            return this._response(id);
        } else {
            return this._response(null);
        }
    }

    // Returns all file metadata stored in the nodes leveldb
    async files() {
        const allDownloadedFiles = await File.allBy('dl_status', DOWNLOAD_STATUS.COMPLETED);
        // union all downloaded files to a unique list
        const allFiles = Array.from(new Set(allDownloadedFiles));
        // return a subset of the attributes to the client
        const files = await Promise.all(allFiles.map((file) =>
            (({id, originalPath, size}) => {
                return {
                    id,
                    originalPath,
                    size
                };
            })(file)
        ));

        return this._response(files);
    }

    // Returns a single file metadata stored in the nodes leveldb
    async fileById() {
        const id = this.req.params.id;
        const file = await File.findOrFail(id);
        return this._response(file);
    }

    // Returns a single chunk metadata stored in the nodes leveldb
    async chunkById() {
        const id = this.req.params.id;
        const chunk = await Chunk.findOrFail(id);
        return this._response(chunk);
    }
}

module.exports = StorageController;
