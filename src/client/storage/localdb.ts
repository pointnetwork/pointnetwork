import path from 'path';
import fs from 'fs/promises';
import config from 'config';
import {FILE_DOWNLOAD_STATUS, FILE_UPLOAD_STATUS} from '../../db/models/file';
import {CHUNK_DOWNLOAD_STATUS, CHUNK_UPLOAD_STATUS} from '../../db/models/chunk';
import {resolveHome} from '../../util';
import * as errors from './errors';

// TODO: move these types to the `db` module (which needs to be converted to TS).
type File = {
    id: string;
    original_path: string;
    size: number;
    dl_status: keyof typeof FILE_DOWNLOAD_STATUS;
    ul_status: keyof typeof FILE_UPLOAD_STATUS;
    expires: number;
    save: () => Promise<void>;
};

type Chunk = {
    id: string;
    size: number;
    dl_status: keyof typeof CHUNK_DOWNLOAD_STATUS;
    ul_status: keyof typeof CHUNK_UPLOAD_STATUS;
    retry_count: number;
    validation_retry_count: number;
    txid: string;
    expires: number;
    save: () => Promise<void>;
};

/**
 * Returns path of file in local disk.
 */
export function getFilePath(fileId: string) {
    const home = resolveHome(config.get('datadir'));
    const dir = path.join(home, config.get('storage.files_path'));
    return path.join(dir, `file_${fileId}`);
}

/**
 * Returns path of chunk in local disk.
 */
function getChunkPath(chunkId: string, operation: 'download' | 'upload') {
    const home = resolveHome(config.get('datadir'));
    const dir = path.join(home, config.get(`storage.${operation}_cache_path`));
    return path.join(dir, `chunk_${chunkId}`);
}

/**
 * Retrieves file from local database (ie: sqlite).
 */
export async function getFileFromLocalDB(file: File, encoding: BufferEncoding): Promise<string> {
    if (file.dl_status === FILE_DOWNLOAD_STATUS.NOT_STARTED) {
        throw new errors.NotDownloadedError('File has not been previously downloaded');
    }
    if (file.dl_status === FILE_DOWNLOAD_STATUS.IN_PROGRESS) {
        throw new errors.InProgressError('File is already being downloaded');
    }
    if (file.dl_status === FILE_DOWNLOAD_STATUS.FAILED) {
        throw new errors.FailedDownloadError('File download is in a "FAILED" state');
    }
    if (file.dl_status === FILE_DOWNLOAD_STATUS.COMPLETED) {
        try {
            const data = await fs.readFile(file.original_path, {encoding});
            return data;
        } catch (err) {
            if (err.code === 'ENOENT') {
                throw new errors.NotFoundError('File not found in local disk');
            }
            throw err;
        }
    }
    throw new errors.UnknownStatus(`File is in an unkown status: ${file.dl_status}`);
}

/**
 * Retrieves chunk from local database (ie: sqlite).
 */
export async function getChunkFromLocalDB(
    chunk: Chunk,
    encoding: BufferEncoding
): Promise<string | null> {
    if (chunk.dl_status === CHUNK_DOWNLOAD_STATUS.NOT_STARTED) {
        throw new errors.NotDownloadedError('Chunk has not been previously downloaded');
    }
    if (chunk.dl_status === CHUNK_DOWNLOAD_STATUS.IN_PROGRESS) {
        throw new errors.InProgressError('Chunk is already being downloaded');
    }
    if (chunk.dl_status === CHUNK_DOWNLOAD_STATUS.FAILED) {
        throw new errors.FailedDownloadError('Chunk download is in a "FAILED" state');
    }
    if (chunk.dl_status === CHUNK_DOWNLOAD_STATUS.COMPLETED) {
        try {
            const chunkpath = getChunkPath(chunk.id, 'download');
            const data = await fs.readFile(chunkpath, {encoding});
            return data;
        } catch (err) {
            if (err.code === 'ENOENT') {
                throw new errors.NotFoundError('Chunk not found in local disk');
            }
            throw err;
        }
    }
    throw new errors.UnknownStatus(`File is in an unkown status: ${chunk.dl_status}`);
}

/**
 * Writes file to local disk and updates the local database.
 */
export async function saveFileToLocalDB(file: File, buf: Buffer) {
    const filepath = getFilePath(file.id);
    await fs.writeFile(filepath, buf);
    file.size = buf.length;
    file.dl_status = FILE_DOWNLOAD_STATUS.COMPLETED as 'COMPLETED';
    await file.save();
}

/**
 * Writes chunk to local disk and updates the local database.
 */
export async function saveChunkToLocalDB(chunk: Chunk, buf: Buffer) {
    const chunkpath = getChunkPath(chunk.id, 'download');
    await fs.writeFile(chunkpath, buf);
    chunk.size = buf.length;
    chunk.dl_status = CHUNK_DOWNLOAD_STATUS.COMPLETED as 'COMPLETED';
    await chunk.save();
}

/**
 * Update file in local database.
 */
export async function updateFile(file: File, update: Partial<File>) {
    Object.keys(update).forEach(k => {
        const key = k as keyof File;
        (file[key] as unknown) = file[key];
    });
    file.save();
}

/**
 * Update chunk in local database.
 */
export async function updateChunk(chunk: Chunk, update: Partial<Chunk>) {
    Object.keys(update).forEach(k => {
        const key = k as keyof Chunk;
        (chunk[key] as unknown) = update[key];
    });
    chunk.save();
}
