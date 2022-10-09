/* eslint-disable @typescript-eslint/no-explicit-any */
import Chunk, {CHUNK_UPLOAD_STATUS} from '../../db/models/chunk';
import File, {FILE_UPLOAD_STATUS} from '../../db/models/file';
import FormData from 'form-data';
import axios from 'axios';
import {promises as fs} from 'fs';
import path from 'path';
import logger from '../../core/log';
import {storage} from './client/client';
import {eachLimit} from 'async';
import {
    BUNDLER_DOWNLOAD_URL,
    BUNDLER_URL,
    CONCURRENT_UPLOAD_LIMIT,
    CONCURRENT_VALIDATION_LIMIT,
    REQUEST_TIMEOUT,
    UPLOAD_CACHE_PATH,
    UPLOAD_EXPIRE,
    UPLOAD_LOOP_INTERVAL,
    VERSION_MAJOR,
    VERSION_MINOR
} from './config';
import {waitForChunkUpload} from './chunk/upload';
import _ from 'lodash';
import {waitForFileChunksToUpload, waitForFileChunksToUploadAndMarkAsSuccessful} from './index';
import {sequelize} from '../../db/models';

const log = logger.child({module: 'StorageUploader'});

const chunksBeingUploaded: Record<string, boolean> = {};

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

export const startChunkUpload = async (chunkId: string) => {
    console.log('YES LINE 45 BEING CALLED HERE ON '+chunkId);
    try {
        log.trace({chunkId}, 'Starting chunk upload');

        const chunk = await sequelize.transaction(async (t) => {
            const chunk = await Chunk.findOrFail(chunkId, {transaction: t, lock: t.LOCK.SHARE});

            // Mark chunk as IN_PROGRESS so it is not picked up again
            if (chunk.ul_status === CHUNK_UPLOAD_STATUS.ENQUEUED || (chunk.ul_status === CHUNK_UPLOAD_STATUS.IN_PROGRESS && chunk.isExpired())) {
                chunk.ul_status = CHUNK_UPLOAD_STATUS.IN_PROGRESS;
                chunk.expires = new Date().getTime() + UPLOAD_EXPIRE;
                console.log('YES LINE 55 BEING CALLED HERE ON '+chunkId);
                await chunk.save({transaction: t});
                return chunk;
            } else {
                // wrong status
                log.trace('startUploadChunk silently exiting, wrong status: ' + chunk.id + ' ' + chunk.ul_status);
                return false;
            }
        });

        if (!chunk) return; // we fell out of sync, don't upload

        const chunkPath = path.join(UPLOAD_CACHE_PATH, `chunk_${chunkId}`);

        log.trace({chunkId}, 'Chunk status marked as IN_PROGRESS');
        const data = await fs.readFile(chunkPath);

        // check if chunk already exists in arweave
        if (! await doesChunkExistOnTheNetwork(chunkId)) {
            const formData = new FormData();
            formData.append('file', data, chunkId);
            formData.append('__pn_integration_version_major', VERSION_MAJOR);
            formData.append('__pn_integration_version_minor', VERSION_MINOR);
            formData.append('__pn_chunk_id', chunkId);
            formData.append(`__pn_chunk_${VERSION_MAJOR}.${VERSION_MINOR}_id`, chunkId);

            const response = await axios.post(`${BUNDLER_URL}/signPOST`, formData, {
                headers: {
                    ...formData.getHeaders(),
                    chunkid: chunkId
                },
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

            log.debug({chunkId, txid}, 'Chunk successfully uploaded');
        } else {
            log.debug({chunkId}, 'The chunk is already in the Bundler cache, skipping');
        }

        await sequelize.transaction(async (t) => {
            const chunk = await Chunk.findOrFail(chunkId, {transaction: t, lock: t.LOCK.SHARE});

            // TODO: do not skip the VALIDATING status!
            // chunk.ul_status = CHUNK_UPLOAD_STATUS.VALIDATING;

            if (chunk.ul_status !== CHUNK_UPLOAD_STATUS.IN_PROGRESS) {
                // we fell out of sync, don't touch
                return;
            }

            chunk.ul_status = CHUNK_UPLOAD_STATUS.COMPLETED;
            await chunk.save({transaction: t});
        });

        delete chunksBeingUploaded[chunkId];

    } catch (e) {
        return await sequelize.transaction(async (t) => {
            const chunk = await Chunk.findOrFail(chunkId, {transaction: t, lock: t.LOCK.SHARE});

            if (chunk.ul_status === CHUNK_UPLOAD_STATUS.IN_PROGRESS) {
                chunk.ul_status = CHUNK_UPLOAD_STATUS.FAILED;
                chunk.retry_count = chunk.retry_count + 1;
                await chunk.save({transaction: t});
                delete chunksBeingUploaded[chunkId];
            } else {
                // we fell out of sync
                // don't touch the chunk row
            }

            log.error({chunkId, message: e.message, stack: e.stack}, 'Chunk upload failed');
            throw e;
        });
    }
};

export const uploadLoop = async () => {
    console.log('UPLOAD_LOOP-------------------------');

    const allAwaitingChunks: Chunk[] = await Chunk.allBy(
        'ul_status',
        CHUNK_UPLOAD_STATUS.ENQUEUED,
        false
    );

    const allStaleChunks: Chunk[] = (
        await Chunk.allBy('ul_status', CHUNK_UPLOAD_STATUS.IN_PROGRESS, false)
    ).filter((chunk: Chunk) => chunk.isExpired());

    await eachLimit(
        [...allAwaitingChunks, ...allStaleChunks],
        CONCURRENT_UPLOAD_LIMIT,
        async chunk => {
            chunksBeingUploaded[chunk.id] = true;
            console.log('UPLOAD_LOOP startChunkUpload('+chunk.id+')-------------------------');
            return await startChunkUpload(chunk.id);
        }
    );

    setTimeout(uploadLoop, UPLOAD_LOOP_INTERVAL);
};

export const chunkValidatorLoop = async () =>
    await sequelize.transaction(async (t) => {
        const allCompletedChunks: Chunk[] = await Chunk.allBy(
            'ul_status',
            CHUNK_UPLOAD_STATUS.VALIDATING,
            false,
            {transaction: t, lock: t.LOCK.SHARE}
        );
        await eachLimit(allCompletedChunks, CONCURRENT_VALIDATION_LIMIT, async chunk => {
            try {
                if (! chunk.txid) throw new Error('chunk.txid is empty at chunk ' + chunk.id);
                await storage.getDataByTxId(chunk.txid);
                chunk.ul_status = CHUNK_UPLOAD_STATUS.COMPLETED;
            } catch (error) {
                log.error(
                    {txid: chunk.txid, message: error.message, stack: error.stack},
                    'Storage validation failed'
                );
                chunk.ul_status = CHUNK_UPLOAD_STATUS.FAILED;
                chunk.validation_retry_count = chunk.validation_retry_count + 1;
            }
            await chunk.save({transaction: t});
        });

        setTimeout(chunkValidatorLoop, UPLOAD_LOOP_INTERVAL);
    });

export const restartChunkUploads = async() => {
    const allInProgressChunks: Chunk[] = await Chunk.allBy(
        'ul_status',
        CHUNK_UPLOAD_STATUS.IN_PROGRESS,
        false
    );

    await eachLimit(
        [...allInProgressChunks],
        CONCURRENT_UPLOAD_LIMIT,
        async chunk => {
            chunksBeingUploaded[chunk.id] = true;
            startChunkUpload(chunk.id); // don't await, since this is a restart
        }
    );
};

export const restartFileUploads = async() => {
    const allInProgressFiles: File[] = await File.allBy(
        'ul_status',
        FILE_UPLOAD_STATUS.IN_PROGRESS,
        false
    );

    for (const f of allInProgressFiles) {
        waitForFileChunksToUploadAndMarkAsSuccessful(f.id); // don't await, since this is a restart
    }
};
