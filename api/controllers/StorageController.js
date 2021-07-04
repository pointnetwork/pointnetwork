const File = require('../../db/models/file');
const Chunk = require('../../db/models/chunk');

class StorageController {
  constructor(ctx, request) {
    this.ctx = ctx
    this.request = request
  }

  async files() {
    const allUploadedFiles = await File.allBy('ul_status', File.UPLOADING_STATUS_UPLOADED)
    const allDownloadedFiles = await File.allBy('dl_status', File.DOWNLOADING_STATUS_DOWNLOADED)
    // union all uploaded and downloaded files to a unique list
    var allFiles = [...new Set([...allUploadedFiles, ...allDownloadedFiles])];
    // return a subset of the attributes to the client
    const files = allFiles.map((file) =>
      (({ id, originalPath, size, redundancy, expires, autorenew, chunkIds }) => ({ id, originalPath, size, redundancy, expires, autorenew, chunkCount: chunkIds.length }))(file))

    return { files }
  }

  async fileById() {
    const id = this.request.params.id
    const file = await File.find(id)
    return { file }
  }

  async chunks() {
    const allUploadedChunks = await Chunk.allBy('ul_status', Chunk.UPLOADING_STATUS_UPLOADED)
    const allDownloadedChunks = await Chunk.allBy('dl_status', Chunk.DOWNLOADING_STATUS_DOWNLOADED)
    // union all uploaded and downloaded chunks to a unique list
    var allChunks = [...new Set([...allUploadedChunks, ...allDownloadedChunks])];
    // return a subset of the attributes to the client
    const chunks = allChunks.map((chunk) =>
      (({ id, redundancy, expires, autorenew }) => ({ id, redundancy, expires, autorenew }))(chunk))

    return { chunks }
  }

  async chunkById() {
    const id = this.request.params.id
    const chunk = await Chunk.find(id)
    return { chunk }
  }
}

module.exports = StorageController
