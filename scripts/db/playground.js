/*
Use this file to test out interating with the leveldb via the js models

NOTE: LevelDB only supports a single client connection at a time so you will need to ensure that nothing else is connected to LevelDB when you run this script otherwise you will see an error becuase of this limitation!
*/

// Initialize the point database service
require('./init')

// now use the db models to check the leveldb database
const File = require('../../db/models/file');
const Chunk = require('../../db/models/chunk');
const ProviderChunk = require('../../db/models/provider_chunk');

(async() => {
  // Some examples below to try:
  const allUploadedFiles = await File.allBy('ul_status', File.UPLOADING_STATUS_UPLOADED)
  const allDownloadedFiles = await File.allBy('dl_status', File.DOWNLOADING_STATUS_DOWNLOADED)

  var allFiles = [...new Set([...allUploadedFiles, ...allDownloadedFiles])];

  const files = allFiles.map((file) =>
    (({ id, originalPath, size, redundancy, expires, autorenew, chunkIds }) => ({ id, originalPath, size, redundancy, expires, autorenew, chunkCount: chunkIds.length }))(file))

  console.log(files)

  // const allChunks = await Chunk.allBy('ul_status', Chunk.UPLOADING_STATUS_UPLOADED)
  const allUploadedChunks = await Chunk.allBy('ul_status', Chunk.UPLOADING_STATUS_UPLOADED)
  const allDownloadedChunks = await Chunk.allBy('dl_status', Chunk.DOWNLOADING_STATUS_DOWNLOADED)
  // union all uploaded and downloaded chunks to a unique list
  var allChunks = [...new Set([...allUploadedChunks, ...allDownloadedChunks])];
  chunks = allChunks.map((chunk) => chunk._attributes)

  console.log(chunks)

  const fileKeys = await File.allKeys();
  console.log(`FileCount: ${fileKeys.length}`);

  const allProviderChunks = await ProviderChunk.allBy('status', ProviderChunk.STATUS_CREATED)
  pchunks = allProviderChunks.map((chunk) => chunk._attributes)
  console.log(pchunks)
})()
