const PointController = require('./PointController')
const File = require('../../db/models/file');
const Chunk = require('../../db/models/chunk');

class StorageController extends PointController {
  constructor(ctx, request) {
    super(ctx)
    this.request = request
  }

  // Returns all file metadata stored in the nodes leveldb
  async files() {
    const allUploadedFiles = await File.allBy('ul_status', File.UPLOADING_STATUS_UPLOADED)
    const allDownloadedFiles = await File.allBy('dl_status', File.DOWNLOADING_STATUS_DOWNLOADED)
    // union all uploaded and downloaded files to a unique list
    var allFiles = [...new Set([...allUploadedFiles, ...allDownloadedFiles])];
    // return a subset of the attributes to the client
    const files = allFiles.map((file) =>
      (({ id, localPath, size, redundancy, expires, autorenew, chunkIds }) => ({ id, localPath, size, redundancy, expires, autorenew, chunkCount: chunkIds.length }))(file))

    return this._response(files);
  }

  // Returns a single file metadata stored in the nodes leveldb
  async fileById() {
    const id = this.request.params.id;
    const file = await File.find(id);
    return this._response(file);
  }

  // Returns all chunk metadata stored in the nodes leveldb
  async chunks() {
    const allUploadedChunks = await Chunk.allBy('ul_status', Chunk.UPLOADING_STATUS_UPLOADED)
    const allDownloadedChunks = await Chunk.allBy('dl_status', Chunk.DOWNLOADING_STATUS_DOWNLOADED)
    // union all uploaded and downloaded chunks to a unique list
    var allChunks = [...new Set([...allUploadedChunks, ...allDownloadedChunks])];
    // return a subset of the attributes to the client
    const chunks = allChunks.map((chunk) =>
      (({ id, redundancy, expires, autorenew }) => ({ id, redundancy, expires, autorenew }))(chunk))

    return this._response(chunks)
  }

  // Returns a single chunk metadata stored in the nodes leveldb
  async chunkById() {
    const id = this.request.params.id
    const chunk = await Chunk.find(id)
    return this._response(chunk)
  }

  // similar to `storage_get` Twig function - gets a files contents from storage by its CID
  async get() {
    const cid = this.request.params.id
    const contents = await this.ctx.client.storage.readFile(cid, 'utf-8');
    return this._response(contents)
  }
}

module.exports = StorageController