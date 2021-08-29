/*
Use this file to test out interating with the leveldb via the js models

NOTE: LevelDB only supports a single client connection at a time so you will need to ensure that nothing else is connected to LevelDB when you run this script otherwise you will see an error becuase of this limitation!
*/

// Initialize the point database service
require('./init');

// now use the db models to check the leveldb database
const File = require('../../db/models/file');
const Chunk = require('../../db/models/chunk');
const ProviderChunk = require('../../db/models/provider_chunk');
const RedKey = require('../../db/models/redkey');
const StorageLink = require('../../db/models/storage_link');

(async() => {
    // Some examples below to try:
    const allUploadedFiles = await File.allBy('ul_status', File.UPLOADING_STATUS_UPLOADED);
    const allDownloadedFiles = await File.allBy('dl_status', File.DOWNLOADING_STATUS_DOWNLOADED);

    var allFiles = [...new Set([...allUploadedFiles, ...allDownloadedFiles])];

    const files = allFiles.map((file) => (({ id, originalPath, size, redundancy, expires, autorenew, chunkIds }) => ({ id, originalPath, size, redundancy, expires, autorenew, chunkCount: chunkIds.length }))(file));

    // const allChunks = await Chunk.allBy('ul_status', Chunk.UPLOADING_STATUS_UPLOADED)
    const allUploadedChunks = await Chunk.allBy('ul_status', Chunk.UPLOADING_STATUS_UPLOADED);
    const allDownloadedChunks = await Chunk.allBy('dl_status', Chunk.DOWNLOADING_STATUS_DOWNLOADED);
    // union all uploaded and downloaded chunks to a unique list
    var allChunks = [...new Set([...allUploadedChunks, ...allDownloadedChunks])];
    chunks = allChunks.map((chunk) => chunk._attributes);

    const allProviderChunks = await ProviderChunk.allBy('status', ProviderChunk.STATUS_CREATED);
    pchunks = allProviderChunks.map((chunk) => chunk._attributes);

    const allRedKeys = await RedKey.all();
    redkeys = allRedKeys.map((redkey) => redkey._attributes);

    const allStorageLinks = await StorageLink.all();
    storageLinks = allStorageLinks.map((storageLink) => storageLink._attributes);

    const OUTPUT_ALL = true;

    if(OUTPUT_ALL) {
        // output all files data to console
        console.log(files);
        // output all chunks data to console
        console.log(chunks);
        // output all provider chunks data to console
        console.log(pchunks);
    }

    const fileKeys = await File.allKeys();
    console.log(`FileCount: ${fileKeys.length}`);

    // Example of calling a function on an instance of a File:
    file = await File.findOrFail(files[0].id);
    console.log(`Test invoking methods in file object id ${file.id}`);
    console.log();
    // test out calling instance methods on the file object:
    console.log('file.getFileSize()\t', file.getFileSize());
    console.log('file.getAllChunkIds():\t ', file.getAllChunkIds());
    console.log('file.getMerkleHash():\t', file.getMerkleHash());
    console.log('file.getMerkleTree():\t', file.getMerkleTree());
    console.log('file.toJSON:\t\t', file.toJSON());
    console.log();

    chunk = await Chunk.findOrFail(chunks[0].id);
    console.log('chunk.toJSON:\t\t', chunk.toJSON());
    console.log();

    if(pchunks[0]) {
        // only available if we are connected to a storage provider
        pcchunk = await ProviderChunk.findOrFail(pchunks[0].id);
        console.log('pcchunk.toJSON:\t\t', pcchunk.toJSON());
        console.log();
    }

    redkey = await RedKey.findOrFail(redkeys[redkeys.length-1].id);
    console.log('redkey.toJOSN:\t\t', redkey.toJSON());
    console.log();

    storageLink = await StorageLink.findOrFail(storageLinks[storageLinks.length-1].id);
    console.log('storageLink.toJOSN:\t\t', storageLink.toJSON());
    console.log();
})();
