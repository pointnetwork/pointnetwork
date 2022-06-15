/* eslint-disable @typescript-eslint/no-explicit-any */
import {resolveHome} from '../../util';
import Chunk, {CHUNK_UPLOAD_STATUS} from '../../db/models/chunk';
import FormData from 'form-data';
import axios from 'axios';
import {promises as fs} from 'fs';
import path from 'path';
import config from 'config';
import logger from '../../core/log';
import {storage} from './storage';
import {eachLimit} from 'async';
import getDownloadQuery from './query';
import {request} from 'graphql-request';

const log = logger.child({module: 'StorageUploader'});

const cacheDir = path.join(
    resolveHome(config.get('datadir')),
    config.get('storage.upload_cache_path')
);
const CONCURRENT_UPLOAD_LIMIT = Number(config.get('storage.concurrent_upload_limit'));
const CONCURRENT_VALIDATION_LIMIT = Number(config.get('storage.concurrent_validation_limit'));
const UPLOAD_LOOP_INTERVAL = Number(config.get('storage.upload_loop_interval'));
const REQUEST_TIMEOUT = Number(config.get('storage.request_timeout'));
const UPLOAD_EXPIRE = Number(config.get('storage.upload_expire'));
const VERSION_MAJOR = config.get('storage.arweave_experiment_version_major');
const VERSION_MINOR = config.get('storage.arweave_experiment_version_minor');
const BUNDLER_URL = config.get('storage.arweave_bundler_url');
const GATEWAY_URL: string = config.get('storage.arweave_gateway_url');

const chunksBeingUploaded: Record<string, boolean> = {};

export const startChunkUpload = async (chunkId: string) => {
    const chunk: any = await Chunk.find(chunkId); // TODO: any
    if (!chunk) {
        throw new Error(`Chunk ${chunkId} upload failed: not found`);
    }

    // Mark chunk as IN_PROGRESS so it is not picked up again
    chunk.ul_status = CHUNK_UPLOAD_STATUS.IN_PROGRESS;
    await chunk.save();

    const chunkPath = path.join(cacheDir, `chunk_${chunkId}`);
    try {
        log.debug({chunkId}, 'Starting chunk upload');
        const data = await fs.readFile(chunkPath);

        // check if chunk already exists in arweave
        try {
            const query = getDownloadQuery(chunkId);
            const queryResult = await request(GATEWAY_URL, query);

            for (const edge of queryResult.transactions.edges) {
                try {
                    const txid = edge.node.id;
                    await storage.getDataByTxId(txid);

                    log.debug({chunkId}, 'Chunk already uploaded to Arweave, cancelling upload');
                    chunk.ul_status = CHUNK_UPLOAD_STATUS.COMPLETED;
                    chunk.txid = txid;
                    chunk.size = data.length;
                    await chunk.save();
                    delete chunksBeingUploaded[chunkId];
                    return;
                } catch (e) {
                    // do nothing
                }
            }
        } catch (e) {
            // do nothing
        }

        chunk.ul_status = CHUNK_UPLOAD_STATUS.IN_PROGRESS;
        chunk.expires = new Date().getTime() + UPLOAD_EXPIRE;
        await chunk.save();

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

        // TODO: do not skip the VALIDATING status!
        // chunk.ul_status = CHUNK_UPLOAD_STATUS.VALIDATING;
        chunk.ul_status = CHUNK_UPLOAD_STATUS.COMPLETED;
        chunk.size = data.length;
        await chunk.save();

        log.debug({chunkId, txid}, 'Chunk successfully uploaded');

        delete chunksBeingUploaded[chunkId];
    } catch (e) {
        log.error({chunkId, message: e.message, stack: e.stack}, 'Chunk upload failed');
        chunk.ul_status = CHUNK_UPLOAD_STATUS.FAILED;
        chunk.retry_count = chunk.retry_count + 1;
        await chunk.save();
        delete chunksBeingUploaded[chunkId];
        throw e;
    }
};

export const uploadLoop = async () => {
    const allAwaitingChunks: any[] = await Chunk.allBy(
        'ul_status',
        CHUNK_UPLOAD_STATUS.ENQUEUED,
        false
    );

    const allStaleChunks: any[] = (
        await Chunk.allBy('ul_status', CHUNK_UPLOAD_STATUS.IN_PROGRESS, false)
    ).filter((chunk: any) => chunk.expires !== null && chunk.expires < new Date().getTime());

    await eachLimit(
        [...allAwaitingChunks, ...allStaleChunks],
        CONCURRENT_UPLOAD_LIMIT,
        async chunk => {
            chunksBeingUploaded[chunk.id] = true;
            startChunkUpload(chunk.id);
        }
    );

    setTimeout(uploadLoop, UPLOAD_LOOP_INTERVAL);
};

export const chunkValidatorLoop = async () => {
    const allCompletedChunks: any[] = await Chunk.allBy(
        'ul_status',
        CHUNK_UPLOAD_STATUS.VALIDATING,
        false
    );
    await eachLimit(allCompletedChunks, CONCURRENT_VALIDATION_LIMIT, async chunk => {
        try {
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
        await chunk.save();
    });

    setTimeout(chunkValidatorLoop, UPLOAD_LOOP_INTERVAL);
};
