import File, {FILE_DOWNLOAD_STATUS, FILE_UPLOAD_STATUS} from '../../db/models/file';
import {
    merkle,
    areScalarArraysEqual,
    statAsync,
    escapeString,
    hashFn,
    calculateDirSize,
    isValidStorageId,
    isZeroStorageId
} from '../../util';
import {promises as fs} from 'fs';
import path from 'path';
import {CHUNK_SIZE, CHUNKINFO_PROLOGUE, FILES_DIR, log} from './config';
import {getChunk} from './chunk';
import {HttpNotFoundError} from '../../core/exceptions';
import {waitForEvent, EventTypes} from './callbacks';
import {enqueueChunkForUpload, waitForChunkUpload} from './chunk/upload';
import {sequelize} from '../../db/models';
const _ = require('lodash');

// todo: remove
// (async() => {
//     const defaults = undefined;
//     const upsertResult = await File.upsert(Object.assign({}, {id: 'b89ca6397b11125953858136bcc27b6e0ad4db9a64d88028c9c99f927affdfe1'}, defaults), {returning: true});
//     console.log('upsert', upsertResult);
//
//     const selectResult = await File.find('b89ca6397b11125953858136bcc27b6e0ad4db9a64d88028c9c99f927affdfe1');
//     console.log('select', selectResult);
//
//     process.exit();
// })();

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

export const waitForFileChunksToUpload = async (id: string): Promise<void> => {
    const file = await File.find(id);
    if (! file) throw new Error('File not found in the database');

    const chunkIds = _.uniq(file.chunk_ids);
    if (file.chunk_ids.length > 1) chunkIds.push(id); // not forgetting about chunkinfo chunk

    await Promise.all(chunkIds.map((chunkId: string) => waitForChunkUpload(chunkId)));
};
export const waitForFileChunksToUploadAndMarkAsSuccessful = async (id: string): Promise<void> => {
    await waitForFileChunksToUpload(id);
    await markFileAsSuccessfulUpload(id);
};

const chunksToTotalLength = (chunks: Buffer[]): number =>
    (chunks.length - 1) * CHUNK_SIZE + chunks[ chunks.length - 1 ].byteLength;

const buffersToHashes = (bufs: Buffer[]): Buffer[] =>
    bufs.map(buf => hashFn(buf));
const buffersToHashesHex = (bufs: Buffer[]): string[] =>
    buffersToHashes(bufs).map(buf => buf.toString('hex'));

const markFileAsFailedUpload = async(fileId: string) => {
    await sequelize.transaction(async (t) => {
        const file = await File.findByIdOrCreate(fileId, {}, t, t.LOCK.SHARE);

        // doesn't matter which status, all of them work

        file.ul_status = FILE_UPLOAD_STATUS.COMPLETED;
        await file.save({transaction: t});
    });
};
const markFileAsSuccessfulUpload = async(fileId: string) => {
    await sequelize.transaction(async (t) => {
        const file = await File.findByIdOrCreate(fileId, {}, t, t.LOCK.SHARE);

        if (file.ul_status === FILE_UPLOAD_STATUS.COMPLETED) {
            // If it's ever been uploaded completely, ignore
            return;
        }

        // IN_PROGRESS, NOT_STARTED and FAILED statuses end up here

        file.ul_status = FILE_UPLOAD_STATUS.FAILED;
        await file.save({transaction: t});
    });
};
const markFileAsBeingUploaded = async(fileId: string, chunkIds: string[], fileSize: number) => {
    // Note: this function is internal
    // We implicitly trust fileId and chunks here and don't re-verify

    console.log('MARK FILE AS BEING UPLOADED '+fileId+' size '+fileSize);
    await sequelize.transaction(async (t) => {
        const file = await File.findByIdOrCreate(fileId, {}, t, t.LOCK.SHARE);

        if (file.ul_status === FILE_UPLOAD_STATUS.COMPLETED) {
            log.trace({fileId}, 'File already exists and uploaded, cancelling upload');
            return fileId;
        }
        if (file.ul_status === FILE_UPLOAD_STATUS.IN_PROGRESS) {
            log.trace({fileId}, 'File upload already in progress, not marking');
            return fileId;
        }

        // only NOT_STARTED and FAILED statuses end up here

        file.ul_status = FILE_UPLOAD_STATUS.IN_PROGRESS;
        file.chunk_ids = chunkIds;
        file.size = fileSize;
        await file.save({transaction: t});
    });
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

export const uploadData = async (data: Buffer | string): Promise<string> => {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const chunks = chunkify(buf);

    let fileId;
    let chunkInfoChunk;
    if (chunks.length <= 1) {
        chunkInfoChunk = null;
        fileId = hashFn(buf).toString('hex');
    } else {
        chunkInfoChunk = createChunkInfoChunk(chunks);
        // File id always matches its info chunk id
        fileId = hashFn(chunkInfoChunk).toString('hex');
    }

    log.trace({fileId}, 'Successfully chunkified file, marking as being uploaded');
    await markFileAsBeingUploaded(fileId, buffersToHashesHex(chunks), buf.byteLength);

    try {
        log.trace({fileId}, 'Calling enqueueChunkForUpload for all file chunks');
        await Promise.all(chunks.map((chunkBuf) => enqueueChunkForUpload(chunkBuf)));
        if (chunkInfoChunk) await enqueueChunkForUpload(chunkInfoChunk);

        log.trace({fileId}, 'Waiting for file chunks to be uploaded');
        await waitForFileChunksToUploadAndMarkAsSuccessful(fileId);

        return fileId;

    } catch (e) {
        log.error({fileId, message: e.message, stack: e.stack}, 'File upload failed');
        await markFileAsFailedUpload(fileId);
        throw e; // todo: don't want to retry?
    }
};

export const uploadFile = uploadData; // todo: deprecate

export const uploadDir = async (dirPath: string) => {
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

    const files = await fs.readdir(dirPath);
    const dirInfo: DirInfo = {
        type: 'dir',
        files: []
    };

    await Promise.all(
        files.map(async fileName => {
            const filePath = path.join(dirPath, fileName);
            const stat = await statAsync(filePath);

            if (stat.isDirectory()) {
                const dirId = await uploadDir(filePath);
                const size = await calculateDirSize(filePath);
                dirInfo.files.push({
                    type: FILE_TYPE.dirptr,
                    name: fileName,
                    size,
                    id: dirId
                });
            } else {
                const file = await fs.readFile(filePath);
                const fileId = await uploadData(file);
                dirInfo.files.push({
                    type: FILE_TYPE.fileptr,
                    name: fileName,
                    size: stat.size,
                    id: fileId
                });
            }
        })
    );

    const id = await uploadData(JSON.stringify(dirInfo));

    log.trace({dirPath: escapeString(dirPath)}, 'Successfully uploaded directory');

    return id;
};

export const getFile = async (
    rawId: string,
    encoding: BufferEncoding = 'utf8',
    useCache = true
): Promise<string | Buffer> => {
    log.trace({fileId: rawId}, 'Getting file');
    const id = (rawId.startsWith('0x') ? rawId.replace('0x', '') : rawId).toLowerCase();

    // ID validation
    if (!isValidStorageId(id)) {
        throw new Error('Invalid storage ID');
    }

    if (isZeroStorageId(id)) {
        throw new Error('Zero storage ID doesn\'t exist');
    }

    const filePath = path.join(FILES_DIR, `file_${id}`);
    const file = await File.findByIdOrCreate(id);
    if (useCache && file.dl_status === FILE_DOWNLOAD_STATUS.COMPLETED) {
        log.trace({fileId: file.id}, 'Returning file from cache');
        return await fs.readFile(filePath, {encoding});
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
        file.dl_status = FILE_DOWNLOAD_STATUS.IN_PROGRESS;
        await file.save();

        log.trace({fileId: file.id}, 'Getting info chunk');

        // TODO: retry logic
        const chunkInfo = await getChunk(file.id, encoding);
        const chunkInfoString = chunkInfo.toString();
        if (!chunkInfoString.startsWith(CHUNKINFO_PROLOGUE)) {
            log.trace({fileId: file.id}, 'File consists of a single chunk, returning it');
            await fs.writeFile(filePath, chunkInfo);

            file.size = chunkInfo.length;
            file.dl_status = FILE_DOWNLOAD_STATUS.COMPLETED;
            await file.save();

            return encoding === null ? chunkInfo : chunkInfo.toString(encoding);
        }

        log.trace({fileId: file.id}, 'Processing chunk info');
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

        log.trace({fileId: file.id}, 'Chunk info for file processed, getting chunks');

        // TODO: retry logic
        const chunkBuffers = await Promise.all(
            chunks.map((chunkId: string) => getChunk(chunkId, encoding))
        );
        const fileBuffer = Buffer.concat([
            ...chunkBuffers.slice(0, -1),
            // We should trim the trailing zeros from the last chunk
            chunkBuffers.length
                ? chunkBuffers[chunkBuffers.length - 1].slice(
                    0,
                    filesize - (chunkBuffers.length - 1) * CHUNK_SIZE
                )
                : Buffer.from([])
        ]);

        log.trace({fileId: file.id}, 'Successfully proceeded file chunks');

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

// @eslint-disable-next-line @typescript-eslint/no-explicit-any
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
