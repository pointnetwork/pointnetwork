const File = require('../../db/models/file');

class StorageController {
  constructor(ctx, request) {
    this.ctx = ctx
    this.request = request
  }

  async files() {
    const allFiles = await File.allBy('ul_status', File.UPLOADING_STATUS_UPLOADED)
    // return a subset of the attributes to the client
    const files = allFiles.map((file) =>
      (({ id, redundancy, expires, autorenew, localPath }) => ({ id, redundancy,expires, autorenew, localPath }))(file))
    return { files }
  }

  async fileById() {
    const id = this.request.params.id
    const file = await File.findBy('id', id)
    return { file }
  }
}

module.exports = StorageController