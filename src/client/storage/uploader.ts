import {resolveHome} from '../../core/utils';
import Chunk, {CHUNK_UPLOAD_STATUS} from '../../db/models/chunk';
import FormData from 'form-data';
import axios from 'axios';
import {promises as fs} from 'fs';
import path from 'path';
import config from 'config';
import logger from '../../core/log';

const log = logger.child({module: 'StorageUploader'});

const cacheDir = path.join(resolveHome(config.get('datadir')), config.get('storage.upload_cache_path'));
const CONCURRENT_UPLOAD_LIMIT = Number(config.get('storage.concurrent_upload_limit'));
const UPLOAD_LOOP_INTERVAL = Number(config.get('storage.upload_loop_interval'));
const REQUEST_TIMEOUT = Number(config.get('storage.request_timeout'));
const UPLOAD_EXPIRE = Number(config.get('storage.upload_expire'));
const VERSION_MAJOR = config.get('storage.arweave_experiment_version_major');
const VERSION_MINOR = config.get('storage.arweave_experiment_version_minor');
const BUNDLER_URL = config.get('storage.arweave_bundler_url');

const chunksBeingUploaded: Record<string, boolean> = {};

export const startChunkUpload = async (chunkId: string) => {
    const chunk: any = await Chunk.find(chunkId); // TODO: any
    if (!chunk) {
        throw new Error(`Chunk ${chunkId} upload failed: not found`);
    }

    const chunkPath = path.join(cacheDir, `chunk_${chunkId}`);
    try {
        log.debug({chunkId}, 'Starting chunk upload');
        const data = await fs.readFile(chunkPath);

        chunk.ul_status = CHUNK_UPLOAD_STATUS.IN_PROGRESS;
        chunk.expires = new Date().getTime() + UPLOAD_EXPIRE;
        await chunk.save();

        const formData = new FormData();
        formData.append('file', data, chunkId);
        formData.append('__pn_integration_version_major', VERSION_MAJOR);
        formData.append('__pn_integration_version_minor', VERSION_MINOR);
        formData.append('__pn_chunk_id', chunkId);
        formData.append(
            `__pn_chunk_${VERSION_MAJOR}.${VERSION_MINOR}_id`,
            chunkId
        );

        const response = await axios.post(
            `${BUNDLER_URL}/signPOST`,
            formData,
            {headers: {...formData.getHeaders()}, timeout: REQUEST_TIMEOUT}
        );

        // TODO: check status from bundler
        if (response.data.status !== 'ok') {
            throw new Error(`Chunk ${chunkId} uploading failed: arweave endpoint error: ${
                JSON.stringify(response.data, null, 2)
            }`);
        }

        chunk.ul_status = CHUNK_UPLOAD_STATUS.COMPLETED;
        chunk.size = data.length;
        await chunk.save();

        log.debug({chunkId}, 'Chunk successfully uploaded');

        delete chunksBeingUploaded[chunkId];
    } catch (e) {
        log.error({chunkId, message: e.message, stack: e.stack}, 'Chunk upload failed');
        chunk.ul_status = CHUNK_UPLOAD_STATUS.FAILED;
        chunk.retry_count = (chunk.retry_count) + 1;
        await chunk.save();
        delete chunksBeingUploaded[chunkId];
        throw e;
    }
};

export const uploadLoop = async () => {
    // TODO: any
    const allAwaitingChunks: any[] = await Chunk.allBy('ul_status', CHUNK_UPLOAD_STATUS.ENQUEUED, false);
    const allStaleChunks: any[] = (await Chunk.allBy('ul_status', CHUNK_UPLOAD_STATUS.IN_PROGRESS, false))
        .filter((chunk: any) => chunk.expires !== null && chunk.expires < new Date().getTime());

    [...allAwaitingChunks, ...allStaleChunks].forEach(chunk => {
        if (Object.keys(chunksBeingUploaded).length <= CONCURRENT_UPLOAD_LIMIT) {
            chunksBeingUploaded[chunk.id] = true;
            startChunkUpload(chunk.id);
        }
    });

    setTimeout(uploadLoop, UPLOAD_LOOP_INTERVAL);
};
