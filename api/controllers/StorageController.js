const File = require('../../db/models/file');
const Chunk = require('../../db/models/chunk');

class StorageController {
  constructor(ctx, request) {
    this.ctx = ctx
    this.request = request
  }

  async files() {
    const allFiles = await File.allBy('ul_status', File.UPLOADING_STATUS_UPLOADED)
    // return a subset of the attributes to the client
    const files = allFiles.map((file) =>
      (({ id, localPath, size, redundancy, expires, autorenew, chunkIds }) => ({ id, localPath, size, redundancy, expires, autorenew, chunkCount: chunkIds.length }))(file))

    return { files }
  }

  async fileById() {
    const id = this.request.params.id
    const file = await File.find(id)
    return { file }
  }

  async chunks() {
    const allChunks = await Chunk.allBy('ul_status', Chunk.UPLOADING_STATUS_UPLOADED)
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