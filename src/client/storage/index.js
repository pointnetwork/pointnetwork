import Chunk, {CHUNK_DOWNLOAD_STATUS, CHUNK_UPLOAD_STATUS} from '../../db/models/chunk';
import File, {FILE_DOWNLOAD_STATUS, FILE_UPLOAD_STATUS} from '../../db/models/file';
import getDownloadQuery from './query';
import {request} from 'graphql-request';
import {
    merkle,
    delay,
    areScalarArraysEqual,
    resolveHome,
    statAsync,
    escapeString,
    hashFn
} from '../../util';
import {storage} from './storage';
import {promises as fs} from 'fs';
import path from 'path';
import config from 'config';
import logger from '../../core/log';
import {uploadLoop, chunkValidatorLoop} from './uploader';

const log = logger.child({module: 'Storage'});

const FILE_TYPE = {
    fileptr: 'fileptr', // File
    dirptr: 'dirptr' // Directory
};

const CHUNKINFO_PROLOGUE = 'PN^CHUNK\x05$\x06z\xf5*INFO';
const CONCURRENT_DOWNLOAD_DELAY = config.get('storage.concurrent_download_delay');
const UPLOAD_LOOP_INTERVAL = Number(config.get('storage.upload_loop_interval'));
const UPLOAD_RETRY_LIMIT = Number(config.get('storage.upload_retry_limit'));
const CHUNK_SIZE = config.get('storage.chunk_size_bytes');
const GATEWAY_URL = config.get('storage.arweave_gateway_url');
const MODE = config.get('mode');

const uploadCacheDir = path.join(resolveHome(config.get('datadir')), config.get('storage.upload_cache_path'));
const downloadCacheDir = path.join(resolveHome(config.get('datadir')), config.get('storage.download_cache_path'));
const filesDir = path.join(resolveHome(config.get('datadir')), config.get('storage.files_path'));

const init = () => {
    uploadLoop();
    chunkValidatorLoop();
};

// TODO: add better error handling with custom errors and keeping error messages in DB
const getChunk = async (chunkId, encoding = 'utf8', useCache = true) => {
    const chunk = await Chunk.findByIdOrCreate(chunkId);
    const chunkPath = path.join(downloadCacheDir, `chunk_${chunkId}`);

    if (useCache && chunk.dl_status === CHUNK_DOWNLOAD_STATUS.COMPLETED) {
        log.debug({chunkId}, 'Returning chunk from cache');
        return fs.readFile(chunkPath, {encoding});
    }
    if (chunk.dl_status === CHUNK_DOWNLOAD_STATUS.IN_PROGRESS) {
        log.debug({chunkId}, 'Chunk download already in progress, waiting');
        await delay(CONCURRENT_DOWNLOAD_DELAY);
        return getChunk(chunkId, encoding); // use cache should be true in this case
    }

    log.debug({chunkId}, 'Downloading chunk');
    try {
        chunk.dl_status = CHUNK_DOWNLOAD_STATUS.IN_PROGRESS;
        await chunk.save();

        const query = getDownloadQuery(chunkId);

        const queryResult = await request(GATEWAY_URL, query);
        log.debug({chunkId}, 'Graphql request success');

        for (const edge of queryResult.transactions.edges) {
            const txid = edge.node.id;
            log.debug({chunkId, txid}, 'Downloading data from arweave');

            const data = await storage.getDataByTxId(txid);
            log.debug({chunkId, txid}, 'Successfully downloaded data from arweave');

            const buf = Buffer.from(data);

            const hash = hashFn(buf).toString('hex');
            if (hash !== chunk.id) {
                log.warn(
                    {chunkId, hash, query, buf: buf.toString()},
                    'Chunk id and data do not match'
                );
                continue;
            }

            await fs.writeFile(chunkPath, buf);

            chunk.size = buf.length;
            chunk.dl_status = CHUNK_DOWNLOAD_STATUS.COMPLETED;
            await chunk.save();
            return buf;
        }

        throw new Error('No matching hash found in arweave');
    } catch (e) {
        log.error({chunkId, message: e.message, stack: e.stack}, 'Chunk download failed');
        chunk.dl_status = CHUNK_DOWNLOAD_STATUS.FAILED;
        await chunk.save();
        throw e;
    }
};

const uploadChunk = async data => {
    const chunkId = hashFn(data).toString('hex');
    const chunk = await Chunk.findByIdOrCreate(chunkId);

    if (chunk.id !== chunkId) {
        throw new Error(`Unexpected chunk ids mismatch: ${chunkId}, ${chunk.id}`);
    }

    const chunkPath = path.join(uploadCacheDir, `chunk_${chunkId}`);
    await fs.writeFile(chunkPath, data);

    log.debug({chunkId}, 'Enqueuing chunk for upload');
    chunk.ul_status = CHUNK_UPLOAD_STATUS.ENQUEUED;
    await chunk.save();

    let uploaded = false;

    const check = async () => {
        const updatedChunk = await Chunk.find(chunkId);
        if (!updatedChunk) {
            throw new Error(`Unexpected upload result: chunk ${chunkId} does not exist`);
        }
        if (updatedChunk.ul_status === CHUNK_UPLOAD_STATUS.FAILED) {
            if (updatedChunk.retry_count >= UPLOAD_RETRY_LIMIT) {
                throw new Error(`Failed to upload chunk ${chunkId}`);
            } if (updatedChunk.validate_retry_count >= UPLOAD_RETRY_LIMIT) {
                throw new Error(`Failed to validate chunk ${chunkId}`);
            } else  {
                updatedChunk.ul_status = CHUNK_UPLOAD_STATUS.ENQUEUED;
                await updatedChunk.save();
            }
        } else if (updatedChunk.ul_status === CHUNK_UPLOAD_STATUS.COMPLETED) {
            log.debug({chunkId}, 'Chunk successfully uploaded');
            uploaded = true;
        }
    };

    while (!uploaded) {
        await check();
        await delay(UPLOAD_LOOP_INTERVAL);
    }

    return chunkId;
};

const uploadFile = async data => {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const totalChunks = Math.ceil(buf.length / CHUNK_SIZE);

    if (totalChunks === 1) {
        const fileId = hashFn(buf).toString('hex');
        log.debug({fileId}, 'File to be uploaded and consists only from 1 chunk');

        const filePath = path.join(filesDir, `file_${fileId}`);
        const file = await File.findByIdOrCreate(fileId, {original_path: filePath});
        if (file.ul_status === FILE_UPLOAD_STATUS.COMPLETED) {
            log.debug({fileId}, 'File already exists, cancelling upload');
            return fileId;
        }
        if (file.ul_status === FILE_UPLOAD_STATUS.IN_PROGRESS) {
            log.debug({fileId}, 'File  upload already in progress, waiting');
            await delay(CONCURRENT_DOWNLOAD_DELAY);
            return uploadFile(data);
        }

        log.debug({fileId}, 'Starting file upload');
        try {
            file.ul_status = FILE_UPLOAD_STATUS.IN_PROGRESS;
            await file.save();

            const chunkId = await uploadChunk(buf);
            if (chunkId !== fileId) {
                throw new Error(
                    `Unexpected different ids for file and it's only chunk: ${fileId}, ${chunkId}`
                );
            }

            await fs.writeFile(filePath, buf);
            file.size = buf.length;
            file.ul_status = FILE_UPLOAD_STATUS.COMPLETED;
            await file.save();

            log.debug({fileId}, 'File successfully uploaded');

            return fileId;
        } catch (e) {
            log.error({fileId, message: e.message, stack: e.stack}, 'File upload failed');
            file.ul_status = FILE_UPLOAD_STATUS.FAILED;
            await file.save();
            throw e;
        }
    }

    const chunks = [];
    for (let i = 0; i < totalChunks; i++) {
        chunks.push(buf.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
    }

    const chunkHashes = chunks.map(chunk => hashFn(chunk).toString('hex'));
    const merkleTree = merkle(
        chunkHashes.map(x => Buffer.from(x, 'hex')),
        hashFn
    );
    const chunkInfoContents =
        CHUNKINFO_PROLOGUE +
        JSON.stringify({
            type: 'file',
            chunks: chunkHashes,
            hash: 'keccak256',
            filesize: buf.length,
            merkle: merkleTree.map(x => x.toString('hex'))
        });
    const chunkInfoBuffer = Buffer.from(chunkInfoContents, 'utf-8');

    // File id always matches it's index chunk id
    const fileId = hashFn(chunkInfoBuffer).toString('hex');

    log.debug({fileId}, 'Successfully chunkified file');
    const filePath = path.join(filesDir, `file_${fileId}`);

    const file = await File.findByIdOrCreate(fileId, {original_path: filePath});
    if (file.ul_status === FILE_UPLOAD_STATUS.COMPLETED) {
        log.debug({fileId}, 'File already exists, cancelling upload');
        return fileId;
    }
    if (file.ul_status === FILE_UPLOAD_STATUS.IN_PROGRESS) {
        log.debug({fileId}, 'File upload already in progress, waiting');
        await delay(CONCURRENT_DOWNLOAD_DELAY);
        return uploadFile(data);
    }

    log.debug({fileId}, 'Uploading file');
    try {
        file.ul_status = FILE_UPLOAD_STATUS.IN_PROGRESS;
        await file.save();

        const indexChunkId = await uploadChunk(chunkInfoBuffer);
        if (indexChunkId !== fileId) {
            throw new Error(
                `Unexpected different ids for file and it's index chunk: ${fileId}, ${indexChunkId}`
            );
        }
        const chunkIds = await Promise.all(chunks.map(chunk => uploadChunk(chunk)));
        chunkIds.forEach((chunkId, index) => {
            if (chunkId !== chunkHashes[index]) {
                throw new Error(
                    `Unexpected different chunks ids, should be same: ${
                        (chunkId, chunkHashes[index])
                    }`
                );
            }
        });

        log.debug({fileId}, 'File successfully uploaded, saving to disk');

        await fs.writeFile(filePath, buf);
        file.size = buf.length;
        file.ul_status = FILE_UPLOAD_STATUS.COMPLETED;
        await file.save();

        log.debug({fileId}, 'File successfully uploaded and saved');
        return fileId;
    } catch (e) {
        log.error({fileId, message: e.message, stack: e.stack}, 'File upload failed');
        file.ul_status = FILE_UPLOAD_STATUS.FAILED;
        await file.save();
        throw e;
    }
};

const uploadDir = async dirPath => {
    try {
        const stat = await statAsync(dirPath);
        const isDir = stat.isDirectory();
        if (!isDir) {
            throw new Error(`Path ${escapeString(dirPath)} is not a directory`);
        }
    } catch (e) {
        if (e.code === 'ENOENT') {
            throw new Error(`Directory ${escapeString(dirPath)} does not exist`);
        }
        throw e;
    }

    log.debug({dirPath: escapeString(dirPath)}, 'Uploading directory');

    const files = await fs.readdir(dirPath);
    const dirInfo = {
        type: 'dir',
        files: []
    };

    await Promise.all(
        files.map(async fileName => {
            const filePath = path.join(dirPath, fileName);
            const stat = await statAsync(filePath);

            if (stat.isDirectory()) {
                const dirId = await uploadDir(filePath);
                dirInfo.files.push({
                    type: FILE_TYPE.dirptr,
                    name: fileName,
                    original_path: filePath,
                    size: stat.size,
                    id: dirId
                });
            } else {
                const file = await fs.readFile(filePath);
                const fileId = await uploadFile(file);
                dirInfo.files.push({
                    type: FILE_TYPE.fileptr,
                    name: fileName,
                    original_path: filePath,
                    size: stat.size,
                    id: fileId
                });
            }
        })
    );

    const id = await uploadFile(JSON.stringify(dirInfo));

    log.debug({dirPath: escapeString(dirPath)}, 'Successfully uploaded directory');

    return id;
};

const getFile = async (rawId, encoding = 'utf8', useCache = true) => {
    const id = (rawId.startsWith('0x') ? rawId.replace('0x', '') : rawId).toLowerCase();

    const filePath = path.join(filesDir, `file_${id}`);
    const file = await File.findByIdOrCreate(id, {original_path: filePath});
    if (useCache && file.dl_status === FILE_DOWNLOAD_STATUS.COMPLETED) {
        log.debug({fileId: file.id}, 'Returning file from cache');
        return await fs.readFile(filePath, {encoding});
    }
    if (file.dl_status === FILE_DOWNLOAD_STATUS.IN_PROGRESS) {
        log.debug({fileId: file.id}, 'File download already in progress, waiting');
        await delay(CONCURRENT_DOWNLOAD_DELAY);
        return getFile(id, encoding); // use cache should be true in this case
    }

    log.debug({fileId: file.id}, 'Downloading file');
    try {
        file.dl_status = FILE_DOWNLOAD_STATUS.IN_PROGRESS;
        await file.save();

        log.debug({fileId: file.id}, 'Getting info chunk');

        // TODO: retry logic
        const chunkInfo = await getChunk(file.id, encoding);
        const chunkInfoString = chunkInfo.toString();
        if (!chunkInfoString.startsWith(CHUNKINFO_PROLOGUE)) {
            log.debug({fileId: file.id}, 'File consists of a single chunk, returning it');
            await fs.writeFile(filePath, chunkInfo);

            file.size = chunkInfo.length;
            file.dl_status = FILE_DOWNLOAD_STATUS.COMPLETED;
            await file.save();

            return encoding === null ? chunkInfo : chunkInfo.toString(encoding);
        }

        log.debug({fileId: file.id}, 'Processing chunk info');
        const toParse = chunkInfoString.slice(CHUNKINFO_PROLOGUE.length);
        const {
            type,
            hash,
            chunks,
            filesize,
            merkle: merkleHash
        } = JSON.parse(toParse);

        if (type !== 'file') {
            throw new Error('Bad file type');
        }

        if (hash !== 'keccak256') {
            throw new Error('Bad hash type');
        }
        const merkleReassembled = merkle(
            chunks.map(x => Buffer.from(x, 'hex')),
            hashFn
        )
            .map(x => x.toString('hex'));
        if (!areScalarArraysEqual(merkleReassembled, merkleHash)) {
            throw new Error('Incorrect Merkle hash');
        }

        log.debug({fileId: file.id}, 'Chunk info for file processed, getting chunks');

        // TODO: retry logic
        const chunkBuffers = await Promise.all(chunks.map(chunkId => getChunk(chunkId, encoding)));
        const fileBuffer = Buffer.concat([
            ...chunkBuffers.slice(0, -1),
            // We should trim the trailing zeros from the last chunk
            chunkBuffers[chunkBuffers.length - 1].slice(
                0,
                filesize - (chunkBuffers.length - 1) * CHUNK_SIZE
            )
        ]);

        log.debug({fileId: file.id}, 'Successfully proceeded file chunks');

        await fs.writeFile(filePath, fileBuffer);

        file.size = filesize;
        file.dl_status = FILE_DOWNLOAD_STATUS.COMPLETED;
        await file.save();

        return encoding === null ? fileBuffer : fileBuffer.toString(encoding);
    } catch (e) {
        log.error({fileId: file.id, message: e.message, stack: e.stack}, 'File download failed');
        file.dl_status = FILE_DOWNLOAD_STATUS.FAILED;
        await file.save();
        throw e;
    }
};

const getJSON = async (id, useCache = true) => {
    log.debug({id}, 'Getting JSON');
    const file = await getFile(id, 'utf8', useCache);
    return JSON.parse(file.toString('utf-8'));
};

const getFileIdByPath = async (dirId, filePath) => {
    const directory = await getJSON(dirId);
    const segments = filePath.split(/[/\\]/).filter(s => s !== '');
    const nextFileOrDir = directory.files.find(f => f.name === segments[0]);
    if (!nextFileOrDir) {
        throw new Error(`Failed to find file ${filePath} in directory ${dirId}: not found`);
    }
    if (segments.length === 1) {
        return nextFileOrDir.id;
    }
    if (nextFileOrDir.type === FILE_TYPE.fileptr) {
        throw new Error(
            `Failed to find file ${filePath} in directory ${dirId}: ${segments[0]} is not a directory`
        );
    } else {
        return getFileIdByPath(nextFileOrDir.id, path.join(...segments.slice(1)));
    }
};

module.exports = MODE === 'zappdev' ? require('./index-arlocal') : {
    FILE_TYPE,
    init,
    getFile,
    getJSON,
    uploadFile,
    uploadDir,
    getFileIdByPath
};
