import File, {FILE_DOWNLOAD_STATUS, FILE_UPLOAD_STATUS} from '../../db/models/file';
import {
    merkle,
    delay,
    areScalarArraysEqual,
    statAsync,
    escapeString,
    hashFn,
    calculateDirSize,
    isValidStorageId,
    isZeroStorageId
} from '../../util';
import {existsSync, promises as fs} from 'fs';
import path from 'path';
import {CHUNK_SIZE, CHUNKINFO_PROLOGUE, CONCURRENT_DOWNLOAD_DELAY, FILES_DIR, log} from './config';
import {uploadChunk, getChunk} from './chunk';
import {HttpNotFoundError} from '../../core/exceptions';

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

export const uploadData = async (data: Buffer | string): Promise<string> => {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const totalChunks = Math.ceil(buf.length / CHUNK_SIZE);

    if (totalChunks === 1) {
        const fileId = hashFn(buf).toString('hex');
        log.trace({fileId}, 'File to be uploaded and consists only from 1 chunk');

        const filePath = path.join(FILES_DIR, `file_${fileId}`);
        const file = await File.findByIdOrCreate(fileId);
        if (file.ul_status === FILE_UPLOAD_STATUS.COMPLETED) {
            log.trace({fileId}, 'File already exists, cancelling upload');
            return fileId;
        }
        if (file.ul_status === FILE_UPLOAD_STATUS.IN_PROGRESS) {
            log.trace({fileId}, 'File  upload already in progress, waiting');
            await delay(CONCURRENT_DOWNLOAD_DELAY);
            return uploadData(data);
        }

        log.trace({fileId}, 'Starting file upload');
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

            log.trace({fileId}, 'File successfully uploaded');

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

    log.trace({fileId}, 'Successfully chunkified file');
    const filePath = path.join(FILES_DIR, `file_${fileId}`);

    const file = await File.findByIdOrCreate(fileId);
    if (file.ul_status === FILE_UPLOAD_STATUS.COMPLETED) {
        log.trace({fileId}, 'File already exists, cancelling upload');
        return fileId;
    }
    if (file.ul_status === FILE_UPLOAD_STATUS.IN_PROGRESS) {
        log.trace({fileId}, 'File upload already in progress, waiting');
        await delay(CONCURRENT_DOWNLOAD_DELAY);
        return uploadData(data);
    }

    log.trace({fileId}, 'Uploading file');
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
                    `Unexpected different chunks ids, should be same: ${chunkId},
                    ${chunkHashes[index]}`
                );
            }
        });

        log.trace({fileId}, 'File successfully uploaded, saving to disk');

        await fs.writeFile(filePath, buf);
        file.size = buf.length;
        file.ul_status = FILE_UPLOAD_STATUS.COMPLETED;
        await file.save();

        log.trace({fileId}, 'File successfully uploaded and saved');
        return fileId;
    } catch (e) {
        log.error({fileId, message: e.message, stack: e.stack}, 'File upload failed');
        file.ul_status = FILE_UPLOAD_STATUS.FAILED;
        await file.save();
        throw e;
    }
};

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
        if (existsSync(filePath)) {
            return await fs.readFile(filePath, {encoding});
        }
        log.warn({fileId: file.id}, 'File marked as downloaded, but is missing on the disk');
    }
    if (file.dl_status === FILE_DOWNLOAD_STATUS.IN_PROGRESS) {
        log.trace({fileId: file.id}, 'File download already in progress, waiting');
        await delay(CONCURRENT_DOWNLOAD_DELAY);
        return getFile(id, encoding); // use cache should be true in this case
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

export const isFileCached = async (fileId: string): Promise<boolean> => {
    const id = (fileId.startsWith('0x') ? fileId.replace('0x', '') : fileId).toLowerCase();
    const filePath = path.join(FILES_DIR, `file_${id}`);
    return fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
};
