/*
Use this file to test out interating with the leveldb via the js models

NOTE: LevelDB only supports a single client connection at a time so you will need to ensure that nothing else is connected to LevelDB when you run this script otherwise you will see an error becuase of this limitation!
*/

// Initialize the point database service
require('./init')

// now use the db models to check the leveldb database
const File = require('../../db/models/file');
const Chunk = require('../../db/models/chunk');

(async() => {
  // Some examples below to try:
  const allFiles = await File.allBy('ul_status', File.UPLOADING_STATUS_UPLOADED)

  const files = allFiles.map((file) =>
    (({ id, localPath, size, redundancy, expires, autorenew, chunkIds }) => ({ id, localPath, size, redundancy, expires, autorenew, chunkCount: chunkIds.length }))(file))

  console.log(files)

  const allChunks = await Chunk.allBy('ul_status', Chunk.UPLOADING_STATUS_UPLOADED)
  chunks = allChunks.map((chunk) => chunk._attributes)
  console.log(chunks)

  const fileKeys = await File.allKeys();
  console.log(`FileCount: ${fileKeys.length}`);
})()