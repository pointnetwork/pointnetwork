import {promises as fs} from 'fs';
import path from 'path';
import config from 'config';
import axios from 'axios';
import Chunk, {CHUNK_DOWNLOAD_STATUS, CHUNK_UPLOAD_STATUS} from '../../db/models/chunk';
import File, {FILE_DOWNLOAD_STATUS, FILE_UPLOAD_STATUS} from '../../db/models/file';
import {
    merkle,
    validateMerkle,
    delay,
    resolveHome,
    statAsync,
    escapeString,
    hashFn,
    validateContentAgainstHash,
    bufferFromChunks
} from '../../util';
import * as storage from './storage';
import * as errors from './errors';
import logger from '../../core/log';
import {uploadLoop} from './uploader';
import {
    getFileFromLocalDB,
    getChunkFromLocalDB,
    updateChunk,
    updateFile,
    saveChunkToLocalDB,
    saveFileToLocalDB,
    getFilePath
} from './localdb';

const log = logger.child({module: 'Storage'});

const FILE_TYPE = {
    fileptr: 'fileptr', // File
    dirptr: 'dirptr' // Directory
};

const CHUNKINFO_PROLOGUE = 'PN^CHUNK\x05$\x06z\xf5*INFO';
const CONCURRENT_DOWNLOAD_DELAY = Number(config.get('storage.concurrent_download_delay'));
const UPLOAD_LOOP_INTERVAL = Number(config.get('storage.upload_loop_interval'));
const UPLOAD_RETRY_LIMIT = Number(config.get('storage.upload_retry_limit'));
const CHUNK_SIZE = config.get('storage.chunk_size_bytes');
const MODE = config.get('mode');
const BUNDLER_DOWNLOAD_URL = `${config.get('storage.arweave_bundler_url')}/download`;

const uploadCacheDir = path.join(
    resolveHome(config.get('datadir')),
    config.get('storage.upload_cache_path')
);
const filesDir = path.join(resolveHome(config.get('datadir')), config.get('storage.files_path'));

const init = () => {
    uploadLoop();
    // TODO: re-enable this validation!
    // chunkValidatorLoop();
};

/**
 * Look for a chunk in the following order:
 *  - local cache (sqlite)
 *  - bundler's backup (S3)
 *  - Arweave's cache
 *  - Arweave's node
 *
 * TODO: add better error handling with custom errors and keeping error messages in DB
 */
const getChunk = async (chunkId, encoding = 'utf8', useCache = true) => {
    log.debug({chunkId}, 'Getting chunk');
    const chunk = await Chunk.findByIdOrCreate(chunkId);

    // If chunk download is in progress, retry after a delay.
    if (chunk.dl_status === CHUNK_DOWNLOAD_STATUS.IN_PROGRESS) {
        log.debug(
            {chunkId},
            `Chunk download in progress, checking again after ${CONCURRENT_DOWNLOAD_DELAY}ms`
        );
        await delay(CONCURRENT_DOWNLOAD_DELAY);
        return getChunk(chunkId, encoding, true);
    }

    // If cache is used, try to get chunk from local disk.
    if (useCache) {
        try {
            const data = await getChunkFromLocalDB(chunk, encoding);
            log.debug({chunkId}, 'Returning chunk from cache');
            return data;
        } catch (err) {
            // Non-critical errors about chunk status can be safely ignored.
            if (!errors.isRecoverableError(err)) {
                throw err;
            }
        }
    }

    // Not using cache or chunk not found in cache, download it.
    await updateChunk(chunk, {dl_status: CHUNK_DOWNLOAD_STATUS.IN_PROGRESS});

    // TODO: refactor before mainnet!!!
    // Due to issues with Arweave, we first try to retrieve
    // chunks from the bundler's backup (S3).
    try {
        log.debug({chunkId}, 'Downloading chunk from bundler backup');
        const {data: buf} = await axios.request({
            method: 'GET',
            url: `${BUNDLER_DOWNLOAD_URL}/${chunkId}`,
            responseType: 'arraybuffer'
        });
        log.debug({chunkId}, 'Successfully downloaded chunk from Bundler backup');
        chunk.size = buf.length;
        chunk.dl_status = CHUNK_DOWNLOAD_STATUS.COMPLETED;
        await saveChunkToLocalDB(chunk, buf);
        return buf;
    } catch (err) {
        log.warn(
            {chunkId, message: err.message, stack: err.stack},
            'Chunk not found in bundler backup'
        );
    }

    const transactions = await storage.getTransactionsByChunkId(chunkId);
    log.debug({chunkId, numberOfTxs: transactions.length}, 'Graphql request success');

    for (const edge of transactions) {
        const txid = edge.node.id;

        try {
            log.debug({chunkId}, 'Downloading chunk from Arweave cache');
            const {data} = await storage.getTxFromCache(txid);
            const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
            log.debug({chunkId, txid}, 'Successfully downloaded chunk from Arweave cache');
            const isValid = validateContentAgainstHash(buf, chunk.id);
            if (!isValid) {
                log.warn({chunkId}, 'Chunk id and data do not match');
                continue;
            }

            await saveChunkToLocalDB(chunk, buf);
            return buf;
        } catch (err) {
            log.warn({chunkId, txid, err}, 'Error fetching transaction data from Arweave cache');
        }

        try {
            log.debug({chunkId, txid}, 'Downloading chunk from Arweave node');
            const data = await storage.getDataByTxId(txid);
            const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
            log.warn({chunkId, txid}, 'Successfully downloaded chunk from Arweave node');
            const isValid = validateContentAgainstHash(buf, chunk.id);
            if (!isValid) {
                log.warn(
                    {chunkId, hash, query, buf: buf.toString()},
                    'Chunk id and data do not match'
                );
                continue;
            }

            await saveChunkToLocalDB(chunk, buf);
            return buf;
        } catch (err) {
            log.warn({chunkId, err}, 'Error fetching transaction data from Arweave node');
        }
    }

    log.error({chunkId}, 'Chunk not found in backup, nor Arweave cache, nor Arweave node');
    await updateChunk(chunk, {dl_status: CHUNK_DOWNLOAD_STATUS.FAILED});
    throw new Error('Chunk not found');
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
            }
            if (updatedChunk.validate_retry_count >= UPLOAD_RETRY_LIMIT) {
                throw new Error(`Failed to validate chunk ${chunkId}`);
            } else {
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
                    `Unexpected different chunks ids, should be same: ${(chunkId,
                    chunkHashes[index])}`
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

/**
 *
 * Retrieves a file, downloading it if needed.
 *
 * If file consists of multiple chunks, it retrieves them all
 * and composes them.
 */
const getFile = async (rawId, encoding = 'utf8', useCache = true) => {
    log.debug({fileId: rawId}, 'Getting file');
    const id = (rawId.startsWith('0x') ? rawId.replace('0x', '') : rawId).toLowerCase();
    const filePath = getFilePath(id);
    const file = await File.findByIdOrCreate(id, {original_path: filePath});

    // If file download is in progress, retry after a delay.
    if (file.dl_status === FILE_DOWNLOAD_STATUS.IN_PROGRESS) {
        log.debug(
            {fileId: file.id},
            `File download in progress, checking again after ${CONCURRENT_DOWNLOAD_DELAY}ms`
        );
        await delay(CONCURRENT_DOWNLOAD_DELAY);
        return getFile(rawId, encoding, true);
    }

    // If cache is used, try to get file from local disk.
    if (useCache) {
        try {
            const data = await getFileFromLocalDB(file, encoding);
            log.debug({fileId: file.id}, 'Returning file from cache');
            return data;
        } catch (err) {
            // Non-critical errors about file status can be safely ignored.
            if (!errors.isRecoverableError(err)) {
                throw err;
            }
        }
    }

    // Not using cache or file not found in cache, download it.
    await updateFile(file, {dl_status: FILE_DOWNLOAD_STATUS.IN_PROGRESS});
    log.debug({fileId: file.id}, 'Downloading file');
    try {
        // TODO: retry logic
        const chunkInfo = await getChunk(file.id, encoding);
        const chunkInfoString = chunkInfo.toString();
        if (!chunkInfoString.startsWith(CHUNKINFO_PROLOGUE)) {
            log.debug({fileId: file.id}, 'File consists of a single chunk, returning it');
            await saveFileToLocalDB(file, chunkInfo);
            return encoding === null ? chunkInfo : chunkInfo.toString(encoding);
        }

        log.debug({fileId: file.id}, 'File consists of multiple chunks, processing chunk info');
        const toParse = chunkInfoString.slice(CHUNKINFO_PROLOGUE.length);
        const {type, hash, chunks, filesize, merkle: expectedMerkleHash} = JSON.parse(toParse);
        log.debug(
            {type, hash, chunks, filesize, merkle: expectedMerkleHash},
            `Parsed chunks info for file ${file.id}`
        );

        if (type !== 'file') {
            throw new Error('Bad file type');
        }
        if (hash !== 'keccak256') {
            throw new Error('Bad hash type');
        }
        if (!validateMerkle(chunks, expectedMerkleHash)) {
            throw new Error('Incorrect Merkle hash');
        } else {
            log.debug({fileId: file.id}, 'Merkle validation is a PASS');
        }

        log.debug({fileId: file.id}, 'Chunk info for file processed, getting chunks');

        // TODO: retry logic
        const chunkBuffers = await Promise.all(chunks.map(chunkId => getChunk(chunkId, encoding)));
        const fileBuffer = bufferFromChunks(chunkBuffers, CHUNK_SIZE, filesize);
        log.debug(
            {fileId: file.id, numberfOfChunks: chunkBuffers.length},
            'Successfully fetched all file chunks'
        );
        await saveFileToLocalDB(file, fileBuffer);
        return encoding === null ? fileBuffer : fileBuffer.toString(encoding);
    } catch (e) {
        log.error({fileId: file.id, message: e.message, stack: e.stack}, 'File download failed');
        await updateFile(file, {dl_status: FILE_DOWNLOAD_STATUS.FAILED});
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

const defaultExports = {
    FILE_TYPE,
    init,
    getFile,
    getJSON,
    uploadFile,
    uploadDir,
    getFileIdByPath
};

module.exports = MODE === 'zappdev' ? require('./index-arlocal') : defaultExports;
