const SEND_STORE_CHUNK_REQUEST = (chunk, link) => {
  return Promise.resolve(true)
  // return new Promise((resolve, reject) => {
  //     this.send('STORE_CHUNK_REQUEST', [chunk.id, chunk.getLength(), chunk.expires], link.provider_id, async(err, result) => {
  //         await link.refresh();
  //         if (!err) {
  //             link.status = StorageLink.STATUS_AGREED;
  //             await link.save();
  //             resolve(true);
  //         } else {
  //             link.error = err.toString();
  //             link.status = StorageLink.STATUS_FAILED; // todo: but why? declined?
  //             await link.save();
  //             reject(err);
  //         }
  //     });
  // });
}

module.exports = {
  SEND_STORE_CHUNK_REQUEST
}