import {delay, hashFn} from '../../../util';
import Chunk, {CHUNK_UPLOAD_STATUS} from '../../../db/models/chunk';
import path from 'path';
import {promises as fs} from 'fs';
import {log, UPLOAD_CACHE_PATH, UPLOAD_LOOP_INTERVAL, UPLOAD_RETRY_LIMIT} from '../config';

const uploadChunk = async (data: Buffer) => {
    const chunkId = hashFn(data).toString('hex');
    const chunk = await Chunk.findByIdOrCreate(chunkId);

    if (chunk.id !== chunkId) {
        throw new Error(`Unexpected chunk ids mismatch: ${chunkId}, ${chunk.id}`);
    }

    const chunkPath = path.join(UPLOAD_CACHE_PATH, `chunk_${chunkId}`);
    await fs.writeFile(chunkPath, data);

    log.debug({chunkId}, 'Enqueuing chunk for upload');
    chunk.ul_status = CHUNK_UPLOAD_STATUS.ENQUEUED;
    await chunk.save();

    let uploaded = false;

    const check = async () => {
        // TODO: any
        const updatedChunk: any = await Chunk.find(chunkId);
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

export default uploadChunk;
