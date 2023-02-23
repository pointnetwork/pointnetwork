/* eslint-disable @typescript-eslint/no-explicit-any */
import Chunk, {CHUNK_UPLOAD_STATUS, CHUNK_DOWNLOAD_STATUS} from '../../db/models/chunk';
import logger from '../../core/log';
import {tryGettingAvailableUploadWorker} from './uploadWorkers';
import {UPLOAD_EXPIRE} from './config';
import Sequelize from 'sequelize';
import {areWeOnline, setSoon} from '../../util';

const log = logger.child({module: 'StorageUploader'});

let isUploadLoopActive = false;
let retryUploadLoop = false;

export const uploadLoop = async () => {
    if (isUploadLoopActive) {
        retryUploadLoop = true;
        return;
    }

    isUploadLoopActive = true;

    // Note: to avoid race conditions, there must be one only uploadLoop executing at any time
    try {
        const allAwaitingChunks: Chunk[] = await Chunk.allBy('ul_status', CHUNK_UPLOAD_STATUS.ENQUEUED);

        const allStaleChunks: Chunk[] = (await Chunk.allBy('ul_status', CHUNK_UPLOAD_STATUS.IN_PROGRESS)).filter((chunk: Chunk) => chunk.isExpired());

        const chunksToUpload = [...allAwaitingChunks, ...allStaleChunks];

        if (chunksToUpload.length === 0) {
            isUploadLoopActive = false;
            return;
        }

        for (const chunkToUpload of chunksToUpload) {
            const worker = tryGettingAvailableUploadWorker();

            if (worker === false) {
                isUploadLoopActive = false;
                return;
            } // no available slots for now

            // slot is available, but before we start, check if we are even online
            if (! areWeOnline()) {
                isUploadLoopActive = false;
                setTimeout(uploadLoop, 1000);
            }

            const chunk = await Chunk.findOrFail(chunkToUpload.id);

            // Mark chunk as IN_PROGRESS, so it is not picked up again
            if (chunk.ul_status === CHUNK_UPLOAD_STATUS.ENQUEUED ||
                (chunk.ul_status === CHUNK_UPLOAD_STATUS.IN_PROGRESS && chunk.isExpired())) {
                const expires = new Date().getTime() + UPLOAD_EXPIRE;
                await Chunk.update({ul_status: CHUNK_UPLOAD_STATUS.IN_PROGRESS, expires}, {
                    where: {
                        id: chunk.id,
                        ul_status: {[Sequelize.Op.notIn]: [CHUNK_UPLOAD_STATUS.FAILED, CHUNK_UPLOAD_STATUS.COMPLETED]}
                    }
                });
            } else {
                // wrong status
                log.trace('startUploadChunk silently exiting, wrong status: ' + chunk.id + ' ' + chunk.ul_status);
                worker.isFree = true;
                continue;
            }

            worker.startChunkUpload(chunk); // no need for await
        }

        isUploadLoopActive = false;

        if (retryUploadLoop) {
            retryUploadLoop = false;
            setSoon(uploadLoop);
        }
    } catch (e) {
        isUploadLoopActive = false;
        throw e;
    }
};

// todo
// export const chunkValidatorLoop = async () =>
//     await sequelize.transaction(async (t) => {
//         const allCompletedChunks: Chunk[] = await Chunk.allBy(
//             'ul_status',
//             CHUNK_UPLOAD_STATUS.VALIDATING,
//             false,
//             {transaction: t, lock: t.LOCK.SHARE}
//         );
//         await eachLimit(allCompletedChunks, CONCURRENT_VALIDATION_LIMIT, async chunk => {
//             try {
//                 if (! chunk.txid) throw new Error('chunk.txid is empty at chunk ' + chunk.id);
//                 await storage.getDataByTxId(chunk.txid);
//                 chunk.ul_status = CHUNK_UPLOAD_STATUS.COMPLETED;
//             } catch (error) {
//                 log.error(
//                     {txid: chunk.txid, message: error.message, stack: error.stack},
//                     'Storage validation failed'
//                 );
//                 chunk.ul_status = CHUNK_UPLOAD_STATUS.FAILED;
//                 chunk.validation_retry_count = chunk.validation_retry_count + 1;
//             }
//             await chunk.save({transaction: t});
//         });
//
//         setTimeout(chunkValidatorLoop, UPLOAD_LOOP_INTERVAL);
//     });

export const restartUploadsDownloads = async () => {
    // Restart chunk uploads
    await Chunk.update({ul_status: CHUNK_UPLOAD_STATUS.ENQUEUED},
        {where: {ul_status: CHUNK_UPLOAD_STATUS.IN_PROGRESS}}
    );

    await Chunk.update({ul_status: CHUNK_DOWNLOAD_STATUS.ENQUEUED},
        {where: {ul_status: CHUNK_DOWNLOAD_STATUS.IN_PROGRESS}}
    );
};
