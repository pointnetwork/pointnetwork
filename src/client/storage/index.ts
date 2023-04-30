import File, {FILE_DOWNLOAD_STATUS, FILE_UPLOAD_STATUS, FILE_DIR_UPLOAD_STATUS} from '../../db/models/file.js';
import {
    merkle,
    areScalarArraysEqual,
    statAsync,
    escapeString,
    hashFn,
    calculateDirSize,
    isValidStorageId,
    isZeroStorageId
} from '../../util/index.js';
import fs from 'fs';
import path from 'path';
import {CHUNK_SIZE, CHUNKINFO_PROLOGUE, FILES_DIR, log} from './config.js';
import {HttpNotFoundError} from '../../core/exceptions.js';
import {waitForEvent, EventTypes} from './callbacks.js';
import {enqueueChunksForUpload} from './chunk/upload.js';
import Sequelize from 'sequelize';
import DirMap from '../../db/models/dir_map.js';
import {addDirAsDirParent, addDirAsFileParent, getDirProgress} from './progress.js';
import {Readable} from 'stream';
import {FastifyReply, FastifyRequest} from 'fastify';
import {getChunkBinary} from './chunk/download.js';

type FileInfo = {
    type: keyof typeof FILE_TYPE;
    name: string;
    size: number;
    id: string;
};

type DirInfo = {
    type: 'dir';
    files: FileInfo[];
};

export const FILE_TYPE = {
    fileptr: 'fileptr', // File
    dirptr: 'dirptr' // Directory
} as const;

export const waitForFileToUpload = async (fileId: string): Promise<string> => {
    const file = await File.findOrFail(fileId);
    if ([FILE_UPLOAD_STATUS.COMPLETED, FILE_UPLOAD_STATUS.FAILED].includes(file.ul_status)) {
        // finalized
        return file.ul_status;
    }

    // still wait
    return await waitForEvent(
        EventTypes.FILE_UPLOAD_STATUS_CHANGED,
        fileId,
        waitForFileToUpload.bind(null, fileId)
    );
};

export const waitForDirToUpload = async (fileId: string): Promise<string> => {
    let file = await File.findOrFail(fileId);

    file = await File.findOrFail(fileId);
    if ([FILE_DIR_UPLOAD_STATUS.COMPLETED, FILE_DIR_UPLOAD_STATUS.FAILED].includes(file.dir_ul_status)) {
        // finalized
        return file.dir_ul_status;
    }

    // still wait
    return await waitForEvent(
        EventTypes.FILE_DIR_UPLOAD_STATUS_CHANGED,
        fileId,
        waitForDirToUpload.bind(null, fileId)
    );
};

const chunksToTotalLength = (chunks: Buffer[]): number =>
    (chunks.length - 1) * CHUNK_SIZE + chunks[chunks.length - 1].byteLength;

const buffersToHashes = (bufs: Buffer[]): Buffer[] =>
    bufs.map(buf => hashFn(buf));

const markFileAsFailedUpload = async (fileId: string) => {
    await File.update({ul_status: FILE_UPLOAD_STATUS.FAILED}, {
        where: {
            id: fileId,
            ul_status: {[Sequelize.Op.notIn]: [FILE_UPLOAD_STATUS.COMPLETED]}
        }
    });
};
const markFileAsBeingUploaded = async (fileId: string, fileSize: number) => {
    // Note: this function is internal
    // We implicitly trust fileId and chunks here and don't re-verify

    await File.update({size: fileSize, ul_status: FILE_UPLOAD_STATUS.IN_PROGRESS},
        {
            where: {
                id: fileId,
                ul_status: FILE_UPLOAD_STATUS.NOT_STARTED
            }
        }
    );
};

const chunkify = (buf: Buffer): Buffer[] => {
    const totalChunks = Math.ceil(buf.length / CHUNK_SIZE);
    if (totalChunks <= 1) {
        return [buf];
    } else {
        const chunkBufs = [];
        for (let i = 0; i < totalChunks; i++) {
            chunkBufs.push(buf.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
        }
        return chunkBufs;
    }
};

const createChunkInfoChunk = (chunks: Buffer[]): Buffer => {
    const chunkHashes = buffersToHashes(chunks);
    const merkleTree = merkle(chunkHashes, hashFn);
    const filesize = chunksToTotalLength(chunks);
    const chunkInfoContents =
        CHUNKINFO_PROLOGUE +
        JSON.stringify({
            type: 'file',
            chunks: chunkHashes.map((b) => b.toString('hex')),
            hash: 'keccak256',
            filesize,
            merkle: merkleTree.map((x) => x.toString('hex'))
        });

    return Buffer.from(chunkInfoContents, 'utf-8');
};

export const uploadData = async (
    data: Buffer | string,
    waitForUpload = true
): Promise<string> => {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);

    // Figure out file ID
    const chunks = chunkify(buf);
    let fileId: string;
    let chunkInfoChunk;
    if (chunks.length <= 1) {
        chunkInfoChunk = null;
        fileId = hashFn(buf).toString('hex');
    } else {
        chunkInfoChunk = createChunkInfoChunk(chunks);
        // File id always matches its info chunk id
        fileId = hashFn(chunkInfoChunk).toString('hex');
    }

    // Creating the file entry. Has to be before enqueueChunksForUpload, otherwise filemap creation will fail
    await File.findByIdOrCreate(fileId);

    log.trace({fileId}, 'Calling enqueueChunksForUpload');
    if (chunkInfoChunk !== null) chunks[-1] = chunkInfoChunk;
    await enqueueChunksForUpload(chunks, fileId);

    try {
        // Mark as IN_PROGRESS, has to be after chunks are written to disk in enqueueChunksForUpload
        log.trace({fileId}, 'Successfully chunkified file, marking as IN_PROGRESS');
        await markFileAsBeingUploaded(fileId, buf.byteLength);

        log.trace({fileId}, 'Waiting for file chunks to be uploaded');
        if (waitForUpload) await waitForFileToUpload(fileId);

        return fileId;

    } catch (e) {
        log.error({fileId, message: e.message, stack: e.stack}, 'File upload failed');
        await markFileAsFailedUpload(fileId);
        throw e; // todo: don't want to retry?
    }
};

export const getUploadDirProgress = async(dirId: string): Promise<Record<string, string|number>> =>
    await getDirProgress(dirId);
    // const file = await File.find(dirId);
    //
    // const total = await DirMap.sum('dir_size', {where: {'dir_id': dirId}});
    //
    // const done = Math.ceil(total * file.dir_ul_progress);
    //
    // return {total, done};

export const uploadDir = async (dirPath: string, waitForUpload = true) => {
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

    log.trace({dirPath: escapeString(dirPath)}, 'Uploading directory');

    const files = await fs.promises.readdir(dirPath);
    const dirInfo: DirInfo = {
        type: 'dir',
        files: []
    };

    await Promise.all(
        files.map(async fileName => {
            const filePath = path.join(dirPath, fileName);
            const stat = await statAsync(filePath);

            if (stat.isDirectory()) {
                const dirId = await uploadDir(filePath, waitForUpload);
                const size = await calculateDirSize(filePath);
                dirInfo.files.push({
                    type: FILE_TYPE.dirptr,
                    name: fileName,
                    size,
                    id: dirId
                });
            } else {
                const file = await fs.promises.readFile(filePath);
                const fileId = await uploadData(file, waitForUpload);
                dirInfo.files.push({
                    type: FILE_TYPE.fileptr,
                    name: fileName,
                    size: stat.size,
                    id: fileId
                });
            }
        })
    );

    const rawDirString = JSON.stringify(dirInfo);
    const id = await uploadData(rawDirString, waitForUpload);

    await Promise.all(
        dirInfo.files.map(async (file, idx) => {
            const dirmapEntry: Record<string, string|number|boolean> = {};
            dirmapEntry.dir_id = id;
            dirmapEntry.file_id = file.id;
            dirmapEntry.dir_size = file.size;
            dirmapEntry.is_dir = (file.type === FILE_TYPE.dirptr);
            dirmapEntry.offset = idx;
            await DirMap.upsert(dirmapEntry, {where: dirmapEntry});

            if (file.type === FILE_TYPE.fileptr) {
                addDirAsFileParent(file.id, id);
            } else {
                addDirAsDirParent(file.id, id);
            }
        })
    );

    const dirmapEntry: Record<string, string|number|boolean> = {};
    dirmapEntry.dir_id = id;
    dirmapEntry.file_id = id;
    dirmapEntry.dir_size = rawDirString.length; // or should it be 0, to match the sizes in json?
    dirmapEntry.is_dir = false; // it will be true when it's a leaf, not a self-entry
    dirmapEntry.offset = -1;
    await DirMap.upsert(dirmapEntry, {where: dirmapEntry});

    addDirAsFileParent(id, id);

    log.trace({dirPath: escapeString(dirPath)}, 'Successfully uploaded directory');

    return id;
};

const markFileAsCompletedDownload = async(file_id: string) => {
    await File.update({dl_status: FILE_DOWNLOAD_STATUS.COMPLETED}, {
        where: {
            id: file_id,
            dl_status: {[Sequelize.Op.notIn]: [FILE_DOWNLOAD_STATUS.COMPLETED]}
        }
    });
};

const markFileAsFailedDownload = async(file_id: string) => {
    await File.update({dl_status: FILE_DOWNLOAD_STATUS.FAILED}, {
        where: {
            id: file_id,
            dl_status: {[Sequelize.Op.notIn]: [FILE_DOWNLOAD_STATUS.COMPLETED]}
        }
    });
};

const markFileAsInProgressDownload = async(file_id: string) => {
    await File.update({dl_status: FILE_DOWNLOAD_STATUS.IN_PROGRESS}, {
        where: {
            id: file_id,
            dl_status: {[Sequelize.Op.notIn]: [FILE_DOWNLOAD_STATUS.COMPLETED]}
        }
    });
};

const validateStorageId = (id: string): void => {
    // ID validation
    if (!isValidStorageId(id)) {
        throw new Error('Invalid storage ID');
    }

    if (isZeroStorageId(id)) {
        throw new Error('Zero storage ID doesn\'t exist');
    }
};

const serveReadableStreamWithFullData = (
    res: FastifyReply,
    data: Buffer,
    encoding: BufferEncoding|null = 'utf8',
    range?: string
): Readable => {
    if (! range) {
        // not a range request, just send the whole thing

        res.header('Content-Length', data.length);

        const readable = new Readable();
        readable._read = () => {}; // _read is required but you can noop it
        readable.push((encoding === null || encoding === 'binary') ? data : data.toString(encoding));
        readable.push(null);
        return readable;

    } else {
        const totalSize = data.length;
        const start = Number((range || '').replace(/bytes=/, '').split('-')[0]);
        const end = Math.max(start, Math.min(start + 1024 * 1024, totalSize - 1)); // Limit to 1MB max

        res.header('Content-Range', `bytes ${start}-${end}/${totalSize}`);
        res.header('Accept-Ranges', 'bytes');
        res.header('Content-Length', end - start + 1);
        res.code(206);

        const readable = new Readable();
        readable._read = () => {}; // _read is required but you can noop it
        const slice = data.slice(start, end + 1);
        readable.push((encoding === null || encoding === 'binary') ? slice : slice.toString(encoding));
        readable.push(null);
        return readable;
    }
};

type ParsedChunkInfo = {
    type: string;
    hashType: string;
    chunkIds: string[];
    filesize: number;
    merkle: string[];
    isValid: boolean;
}

const parseChunkInfo = (chunkInfo: Buffer): ParsedChunkInfo => {
    const chunkInfoString = chunkInfo.toString('utf8');

    const toParse = chunkInfoString.slice(CHUNKINFO_PROLOGUE.length);
    const {type, hash, chunks, filesize, merkle: merkleHash} = JSON.parse(toParse);

    if (type !== 'file') {
        throw new Error('Bad file type');
    }

    if (hash !== 'keccak256') {
        throw new Error('Bad hash type');
    }
    const merkleReassembled = merkle(
        chunks.map((x: string) => Buffer.from(x, 'hex')),
        hashFn
    ).map(x => x.toString('hex'));
    if (!areScalarArraysEqual(merkleReassembled, merkleHash)) {
        throw new Error('Incorrect Merkle hash');
    }

    return {
        type,
        hashType: hash,
        chunkIds: chunks,
        filesize,
        merkle: merkleHash,
        isValid: true
    };
};

export const getFileAsReadStream = async (
    req: FastifyRequest,
    res: FastifyReply,
    rawId: string,
    encoding: BufferEncoding|null = 'utf8',
    range?: string
): Promise<Readable> => {
    log.trace({fileId: rawId, encoding}, 'Getting file as stream');
    const id = (rawId.startsWith('0x') ? rawId.replace('0x', '') : rawId).toLowerCase();

    validateStorageId(id);

    const file = await File.findByIdOrCreate(id);

    // Download chunk info, first things first
    const chunkInfo = await getChunkBinary(id);
    const chunkInfoString = chunkInfo.toString();
    if (!chunkInfoString.startsWith(CHUNKINFO_PROLOGUE)) {
        log.trace({fileId: file.id}, 'File consists of a single chunk, returning it');

        file.size = chunkInfo.length;
        await markFileAsCompletedDownload(file.id);

        return serveReadableStreamWithFullData(res, chunkInfo, encoding, range);
    }

    // If we're here, the situation is more complicated: there are multiple chunks
    log.trace({fileId: file.id}, 'Processing chunk info');
    const chunkInfoParsed = parseChunkInfo(chunkInfo);

    log.trace({fileId: file.id}, 'Chunk info for file processed, getting chunks');

    // Now here I should get all the chunks and serve them one by one

    const createReadableStream = async (
        req: FastifyRequest, res: FastifyReply, chunkIds: string[], totalSize: number
    ) => {
        const readable = new Readable({
            read() {
                // Resume downloading when we see buffer is not full anymore
                if (!downloading && !closed) {
                    downloading = true;
                    downloadChunk(lastChunkIdx + 1);
                }
            }
        });

        let downloading = true;
        let closed = false;
        let lastChunkIdx = -1;

        let start = 0;
        let end = 0;
        if (!range) {
            // not a range request, just send the whole thing
            res.header('Content-Length', totalSize);
        } else {
            // range request, send partial content
            start = Number((range || '').replace(/bytes=/, '').split('-')[0]);
            end = Math.max(start, Math.min(start + 1024 * 1024, totalSize - 1)); // Limit to 1MB max

            res.header('Content-Range', `bytes ${start}-${end}/${totalSize}`);
            res.header('Accept-Ranges', 'bytes');
            res.header('Content-Length', end - start + 1);
            res.code(206);
        }

        let startChunkIdx = 0;
        let endChunkIdx = chunkIds.length - 1;
        if (range) {
            startChunkIdx = Math.floor(start / CHUNK_SIZE);
            endChunkIdx = Math.floor(end / CHUNK_SIZE);
        }

        downloadChunk(startChunkIdx);

        // Handle client disconnect
        req.raw.on('close', () => {
            downloading = false;
            closed = true;
        });

        // Push the chunk into the readable stream
        function pushChunk(chunkIdx: number, chunk: Buffer) {
            const dataToPush = range ?
                chunk.slice(start - chunkIdx * CHUNK_SIZE, end - chunkIdx * CHUNK_SIZE + 1)
                :
                chunk;

            const data = (encoding === null || encoding === 'binary') ? dataToPush : dataToPush.toString(encoding);
            const pushResult = readable.push(data);
            if (pushResult) {
                // Buffer is getting full, next push will fail! Pause downloading
                downloading = false;
                lastChunkIdx = chunkIdx;
            }
        }

        // Download the chunk and push it into the stream
        async function downloadChunk(chunkIdx: number) {
            try {
                if (chunkIdx > endChunkIdx) {
                    // Signal the end of the stream
                    readable.push(null);
                    return;
                }

                const chunkId = chunkIds[chunkIdx];
                const buf = await getChunkBinary(chunkId);
                pushChunk(chunkIdx, buf);

                // Download the next chunk
                if (downloading) {
                    downloadChunk(chunkIdx + 1);
                }
            } catch (e) {
                log.error({fileId: file.id}, 'Error while downloading chunk');
                readable.emit('error', e);
            }
        }

        // readable.on('readable', () => {
        //     // Resume downloading when we see buffer is not full anymore
        //     if (!downloading && !closed) {
        //         downloading = true;
        //         downloadChunk(lastChunkIdx + 1);
        //     }
        // });

        return readable;
    };

    return createReadableStream(req, res, chunkInfoParsed.chunkIds, chunkInfoParsed.filesize);
};

export const getFile = async (
    rawId: string,
    encoding: BufferEncoding|null = 'utf8',
    useCache = true
): Promise<string | Buffer> => {
    log.trace({fileId: rawId}, 'Getting file');
    const id = (rawId.startsWith('0x') ? rawId.replace('0x', '') : rawId).toLowerCase();

    validateStorageId(id);

    const filePath = path.join(FILES_DIR, `file_${id}`);
    const file = await File.findByIdOrCreate(id);
    if (useCache && file.dl_status === FILE_DOWNLOAD_STATUS.COMPLETED) {
        log.trace({fileId: file.id}, 'Returning file from cache');
        if (fs.existsSync(filePath)) {
            return await fs.promises.readFile(filePath, {encoding: (encoding === 'binary' ? null : encoding)});
        }
        log.warn({fileId: file.id}, 'File marked as downloaded, but is missing on the disk');
    }
    if (file.dl_status === FILE_DOWNLOAD_STATUS.IN_PROGRESS) {
        log.trace({fileId: file.id}, 'File download already in progress, waiting');
        return await waitForEvent(
            EventTypes.FILE_DOWNLOAD_STATUS_CHANGED,
            file.id,
            getFile.bind(null, rawId, encoding, useCache)
        );
    }

    log.trace({fileId: file.id}, 'Downloading file');
    try {
        // Mark it as IN_PROGRESS
        await markFileAsInProgressDownload(file.id);

        log.trace({fileId: file.id}, 'Getting info chunk');

        // TODO: retry logic
        const chunkInfo = await getChunkBinary(file.id);

        const chunkInfoString = chunkInfo.toString('utf-8');
        if (!chunkInfoString.startsWith(CHUNKINFO_PROLOGUE)) {
            log.trace({fileId: file.id}, 'File consists of a single chunk, returning it');
            await fs.promises.writeFile(filePath, chunkInfo);

            file.size = chunkInfo.length;
            await markFileAsCompletedDownload(file.id);

            return (encoding === null || encoding === 'binary') ? chunkInfo : chunkInfo.toString(encoding);
        }

        log.trace({fileId: file.id}, 'Processing chunk info');
        const chunkInfoParsed = parseChunkInfo(chunkInfo);

        log.trace({fileId: file.id}, 'Chunk info for file processed, getting chunks');

        // Here's where the download of all chunks happens, in parallel!
        // TODO: retry logic
        const chunkBuffers = await Promise.all(
            chunkInfoParsed.chunkIds.map((chunkId: string) => getChunkBinary(chunkId))
        );

        const fileBuffer = Buffer.concat([
            ...chunkBuffers.slice(0, -1),
            // We should trim the trailing zeros from the last chunk
            chunkBuffers.length
                ? chunkBuffers[chunkBuffers.length - 1].slice(
                    0,
                    chunkInfoParsed.filesize - (chunkBuffers.length - 1) * CHUNK_SIZE
                )
                : Buffer.from([])
        ]);

        log.trace({fileId: file.id}, 'Successfully processed file chunks');

        await fs.promises.writeFile(filePath, fileBuffer);

        await markFileAsCompletedDownload(file.id);

        return (encoding === null || encoding === 'binary') ? fileBuffer : fileBuffer.toString(encoding);
    } catch (e) {
        log.error({fileId: file.id, message: e.message, stack: e.stack}, 'File download failed');

        await markFileAsFailedDownload(file.id);

        throw e;
    }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getJSON = async <T = any>(id: string, useCache = true): Promise<T> => {
    log.trace({id}, 'Getting JSON');
    const file = await getFile(id, 'utf8', useCache);
    return JSON.parse(file.toString('utf-8'));
};

export const getFileIdByPath = async (dirId: string, filePath: string): Promise<string> => {
    const directory = await getJSON<DirInfo>(dirId);
    const segments = filePath.split(/[/\\]/).filter(s => s !== '');
    const nextFileOrDir = directory.files.find(f => f.name === segments[0]);
    if (!nextFileOrDir) {
        throw new HttpNotFoundError(
            `Failed to find file ${filePath} in directory ${dirId}: not found`
        );
    }
    if (segments.length === 1) {
        return nextFileOrDir.id;
    }
    if (nextFileOrDir.type === FILE_TYPE.fileptr) {
        throw new HttpNotFoundError(
            `Failed to find file ${filePath} in directory ${dirId}: ${segments[0]} is not a directory`
        );
    } else {
        return getFileIdByPath(nextFileOrDir.id, path.join(...segments.slice(1)));
    }
};

export const getFileBinary = async (fileId: string, useCache = true): Promise<Buffer> => {
    const buf = await getFile(fileId, null, useCache);
    if (!Buffer.isBuffer(buf)) {
        throw new Error('Expected buffer, this should never happen');
    }
    return buf;
};

export const isFileCached = async (fileId: string): Promise<boolean> => {
    const id = (fileId.startsWith('0x') ? fileId.replace('0x', '') : fileId).toLowerCase();
    const filePath = path.join(FILES_DIR, `file_${id}`);
    return fs
        .promises
        .access(filePath)
        .then(() => true)
        .catch(() => false);
};
