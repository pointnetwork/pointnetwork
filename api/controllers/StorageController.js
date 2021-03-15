class StorageController {
  constructor(ctx) {
    this.ctx = ctx
  }

  files() {
    return {files: []}
  }
}

module.exports = StorageController