import {hashFn} from '../../../util';
import Chunk, {CHUNK_DOWNLOAD_STATUS, CHUNK_UPLOAD_STATUS} from '../../../db/models/chunk';
import path from 'path';
import {promises as fs, existsSync} from 'fs';
import {UPLOAD_CACHE_PATH} from '../config';
import {FileMap} from '../../../db/models';
import {uploadLoop} from '../uploader';
import Sequelize from 'sequelize';
import {addFileAsChunkParent} from '../progress';

export const enqueueChunksForUpload = async (chunks: Buffer[], fileId: string): Promise<void> => {
    const chunkIds: Record<string, string> = {};
    for (const [idx, data] of Object.entries(chunks)) { // don't use .map, it will skip -1 index
        chunkIds[idx] = hashFn(data).toString('hex');
    }

    for (const cIdx in chunks) {
        const chunkId = chunkIds[cIdx];
        const data = chunks[cIdx];
        const chunkPath = path.join(UPLOAD_CACHE_PATH, `chunk_${chunkId}`);
        if (!existsSync(chunkPath)) {
            // tmp name
            const tmpPath = path.join(UPLOAD_CACHE_PATH, `chunk_${chunkId}_tmp_${Date.now()}`);

            // write to disk
            await fs.writeFile(tmpPath, data);

            // rename to final name
            await fs.rename(tmpPath, chunkPath);
        }
    }

    // Bulk create chunk entries
    const chunkEntries = [];
    for (const chunkId of Object.values(chunkIds)) { // don't use .map, it will skip -1 index
        chunkEntries.push({
            id: chunkId,
            ul_status: CHUNK_UPLOAD_STATUS.ENQUEUED, dl_status: CHUNK_DOWNLOAD_STATUS.COMPLETED
        });
    }
    await Chunk.bulkCreate(chunkEntries, {ignoreDuplicates: true});

    // Fix statuses of existing entries
    await Chunk.update(
        {ul_status: CHUNK_UPLOAD_STATUS.ENQUEUED, dl_status: CHUNK_DOWNLOAD_STATUS.COMPLETED},
        {
            include:
            [{model: FileMap, where: {file_id: fileId}}],
            where: {ul_status: {[Sequelize.Op.in]: [CHUNK_UPLOAD_STATUS.NOT_STARTED, CHUNK_UPLOAD_STATUS.FAILED]}}
        }
    );

    // Bulk create filemap entries
    const filemapEntries = [];
    for (const [idx, chunkId] of Object.entries(chunkIds)) { // don't use .map, it will skip -1 index
        filemapEntries.push({file_id: fileId, chunk_id: chunkId, offset: idx});
    }
    await FileMap.bulkCreate(filemapEntries, {ignoreDuplicates: true});

    // add as parents
    for (const chunkId of Object.values(chunkIds)) { // don't use .map, it will skip -1 index
        await addFileAsChunkParent(fileId, chunkId);
    }

    // trigger upload loop
    setTimeout(uploadLoop, 0);
};