import {hashFn} from '../../../util';
import Chunk, {CHUNK_UPLOAD_STATUS} from '../../../db/models/chunk';
import path from 'path';
import {promises as fs, existsSync} from 'fs';
import {log, UPLOAD_CACHE_PATH, UPLOAD_RETRY_LIMIT} from '../config';
import {waitForEvent, EventTypes} from '../callbacks';
import {sequelize} from '../../../db/models';

export const enqueueChunkForUpload = async(data: Buffer): Promise<string> => {
    const chunkId = hashFn(data).toString('hex');

    return await sequelize.transaction(async (t) => {
        const chunk = await Chunk.findByIdOrCreate(chunkId, null, t, t.LOCK.SHARE);

        const chunkPath = path.join(UPLOAD_CACHE_PATH, `chunk_${chunkId}`);

        if (chunk.ul_status !== CHUNK_UPLOAD_STATUS.NOT_STARTED) {
            // Should already be on the disk
            if (! existsSync(chunkPath)) {
                throw new Error(`Chunk ${chunkId} has status ${chunk.ul_status} but not present on the disk`);
            }
        }

        log.debug({chunkId}, 'Enqueuing chunk for upload');
        switch (chunk.ul_status) {
            case CHUNK_UPLOAD_STATUS.COMPLETED:
            case CHUNK_UPLOAD_STATUS.IN_PROGRESS:
            case CHUNK_UPLOAD_STATUS.ENQUEUED:
            case CHUNK_UPLOAD_STATUS.VALIDATING:
                // already uploaded or in progress, don't touch
                break;
            case CHUNK_UPLOAD_STATUS.NOT_STARTED:
                // write to disk
                await fs.writeFile(chunkPath, data);

                chunk.ul_status = CHUNK_UPLOAD_STATUS.ENQUEUED;
                chunk.size = data.byteLength;
                await chunk.save({transaction:t});
                break;
            case CHUNK_UPLOAD_STATUS.FAILED: // let's try again
                chunk.ul_status = CHUNK_UPLOAD_STATUS.ENQUEUED;
                await chunk.save({transaction:t});
                break;
            default:
                throw new Error('Unexpected ul_status of chunk');
        }

        return chunkId;
    });
};

export const waitForChunkUpload = async(chunkId: string): Promise<string> => {
    const uploaded = await sequelize.transaction(async (t) => {
        const chunk = await Chunk.findOrFail(chunkId, {transaction: t, lock: t.LOCK.SHARE});

        if (chunk.ul_status === CHUNK_UPLOAD_STATUS.FAILED) {
            if (chunk.retry_count >= UPLOAD_RETRY_LIMIT) {
                throw new Error(`Failed to upload chunk ${chunkId}`);
            } else {
                // still has retries, re-enqueue
                chunk.retry_count++;
                chunk.ul_status = CHUNK_UPLOAD_STATUS.ENQUEUED;
                await chunk.save({transaction: t});
                return false;
            }

        } else if (chunk.ul_status === CHUNK_UPLOAD_STATUS.COMPLETED) {
            log.debug({chunkId}, 'Chunk successfully uploaded');
            return true;

        } else {
            return false;
        }
    });

    if (!uploaded) {
        return await waitForEvent(
            EventTypes.CHUNK_UPLOAD_STATUS_CHANGED,
            chunkId,
            waitForChunkUpload.bind(null, chunkId)
        );
    }

    return chunkId;
};
