import {
    BUNDLER_DOWNLOAD_URL,
    BUNDLER_URL,
    CONCURRENT_UPLOAD_LIMIT, REQUEST_TIMEOUT, UPLOAD_CACHE_PATH, VERSION_MAJOR, VERSION_MINOR
} from './config';
import Chunk, {CHUNK_UPLOAD_STATUS} from '../../db/models/chunk';
import path from 'path';
import {promises as fs} from 'fs';
import FormData from 'form-data';
import axios from 'axios';
import logger from '../../core/log';
import {uploadLoop} from './uploader';
import {updateChunkProgressAsCompleted} from './progress';
import {setSoon} from '../../util/index';

const log = logger.child({module: 'UploadWorker'});

const doesChunkExistOnTheNetwork = async (chunkId: string) => {
    // const buf = await downloadChunk(BUNDLER_DOWNLOAD_URL, chunkId);
    try {
        const response = await axios.request({
            method: 'HEAD',
            url: `${BUNDLER_DOWNLOAD_URL}/${chunkId}`,
            responseType: 'arraybuffer'
        });
        return (response.status === 200);
    } catch (e) {
        return false;
    }
};

const markChunkAsSuccessfulUpload = async(chunkId: string) => {
    const chunk = await Chunk.findOrFail(chunkId);

    // TODO: do not skip the VALIDATING status!
    // chunk.ul_status = CHUNK_UPLOAD_STATUS.VALIDATING;

    if (chunk.ul_status !== CHUNK_UPLOAD_STATUS.IN_PROGRESS) {
        // we fell out of sync, don't touch
        return;
    }

    await Chunk.update(
        {ul_status: CHUNK_UPLOAD_STATUS.COMPLETED},
        {where: {id: chunkId, ul_status: CHUNK_UPLOAD_STATUS.IN_PROGRESS}}
    );

    // Mark in the cache that this chunk is completed
    await updateChunkProgressAsCompleted(chunkId);

    return true;
};

const doChunkUpload = async (chunk: Chunk) => {
    const chunkId = chunk.id;
    try {
        log.trace({chunkId}, 'Starting chunk upload');

        if (!chunk) { return; } // we fell out of sync, don't upload

        const chunkPath = path.join(UPLOAD_CACHE_PATH, `chunk_${chunkId}`);

        const data = await fs.readFile(chunkPath);

        // check if chunk already exists in arweave
        if (! await doesChunkExistOnTheNetwork(chunkId)) {
            const formData = new FormData();
            formData.append('file', data, chunkId);
            formData.append('__pn_integration_version_major', VERSION_MAJOR);
            formData.append('__pn_integration_version_minor', VERSION_MINOR);
            formData.append('__pn_chunk_id', chunkId);
            formData.append(`__pn_chunk_${VERSION_MAJOR}.${VERSION_MINOR}_id`, chunkId);

            const headers = {
                ...formData.getHeaders(),
                'chunkid': chunkId,

                'Content-Length': false,
                'Transfer-Encoding': 'chunked'
            };
            /***
             * Here's why we force the Content-Length to false in the above headers:
             *
             * I had run the identical uploader script, and it failed in one case, and succeeded in the other.
             * Narrowed down the difference to axios version: 0.27.2 always worked, 1.3.4 always failed.
             *
             * If I hadn't investigated, we would have been stuck with the old version.
             * The only difference was that axios 1.3.4 was sending the Content-Length header,
             * and the bundler was rejecting the request with "Missing required key 'Key' in params"
             * And axios 0.27.2 was not sending the Content-Length header at all.
             *
             * So when I force the Content-Length to false here, it suddenly works on both versions.
             *
             * It might be due to the fact that Transfer-Encoding is set to chunked (which I make sure to set again,
             * because 0.27.2 will not set it if Content-Length is present in any way), in which case
             * Content-Length must be omitted. If you figure out more details, let me know. ~ Serge Var
             */

            const response = await axios.post(`${BUNDLER_URL}/signPOST`, formData, {
                headers,
                timeout: REQUEST_TIMEOUT
            });

            // NB: bundler no longer does return the txid
            // if (response.data.status !== 'ok' || !response.data.txid) {
            if (response.data.status !== 'ok') {
                throw new Error(
                    `Chunk ${chunkId} uploading failed: arweave endpoint error: ${
                        JSON.stringify(response.data, null, 2)
                    }`
                );
            }

            const txid = response.data.txid;

            if (txid) {
                chunk.txid = txid;
            }

            log.trace({chunkId, txid}, 'Chunk successfully uploaded');
        } else {
            log.trace({chunkId}, 'The chunk is already in the Bundler cache, skipping');
        }

        // Success! Mark it as such
        await markChunkAsSuccessfulUpload(chunkId);

    } catch (e) {
        await chunk.markAsFailedOrRestart();

        log.error({chunkId, message: e.message, stack: e.stack}, 'Chunk upload failed');
        throw e;
    }
};

class UploadWorker {
    declare isFree: boolean;
    declare slotIdx: number;

    public startChunkUpload = async(chunk: Chunk) => {
        logger.trace({chunkId: chunk.id, slotIdx: this.slotIdx}, `Upload worker ${this.slotIdx} started chunk upload`);

        this.isFree = false;
        try {
            await doChunkUpload(chunk);

            this.isFree = true;
            setSoon(uploadLoop);
            logger.trace({chunkId: chunk.id, slotIdx: this.slotIdx}, `Upload worker ${this.slotIdx} finished chunk upload`);
            return;

        } catch (e) {
            this.isFree = true;
            setSoon(uploadLoop);
            logger.trace({chunkId: chunk.id, slotIdx: this.slotIdx}, `Upload worker ${this.slotIdx} failed chunk upload`);
            throw e;
        }
    };
}

const uploadWorkers: UploadWorker[] = [];

export const tryGettingAvailableUploadWorker = () => {
    if (uploadWorkers.length < CONCURRENT_UPLOAD_LIMIT) {
        // Add new slot
        const worker = new UploadWorker();
        worker.slotIdx = uploadWorkers.length;
        uploadWorkers.push(worker);
        return worker;
    } else {
        // Try reusing a slot
        for (const slotIdx in uploadWorkers) {
            const worker = uploadWorkers[slotIdx];
            if (worker.isFree) {
                // remove the previous one and create a fresh one in its place
                uploadWorkers[slotIdx] = new UploadWorker();
                uploadWorkers[slotIdx].slotIdx = Number(slotIdx);
                return uploadWorkers[slotIdx];
            }
        }
    }

    return false;
};
