import {CHUNK_UPLOAD_STATUS} from '../../db/models/chunk';
import Sequelize from 'sequelize';
import {FILE_DIR_UPLOAD_STATUS, FILE_UPLOAD_STATUS} from '../../db/models/file';
import {setSoon} from '../../util';
import Queue from '../../util/queue';
import {DirMap, FileMap} from '../../db/models';

/*** Cursed cursed codebase! But it works for now ***/

const logger = require('../../core/log');
const log = logger.child({module: 'progress'});

type FileUploadStructure = {
    uploaded: boolean,
    failed: boolean,
    progress: number,
    chunk_ids: string[],
    size: number,
}
type DirUploadStructure = {
    uploaded: boolean,
    progress: number,
    failed: boolean,
    file_ids: string[],
    is_dir: Record<string, boolean>,
    totalChunks: number,
    dir_size: number
}

const fileUploadCache: Record<string, FileUploadStructure> = {};
const dirUploadCache: Record<string, DirUploadStructure> = {};
const chunkUploadCache: Record<string, string> = {};

const progressUpdateQueue = new Queue();
let progressUpdateQueueActive = false;
const chunkParents_useKeysAsFileIDs: Record<string, Record<string, boolean>> = {};
const fileParents_useKeysAsDirIDs: Record<string, Record<string, boolean>> = {};
const dirParents_useKeysAsDirIDs: Record<string, Record<string, boolean>> = {};

const processQueue = async() => {
    if (progressUpdateQueueActive) return;
    if (progressUpdateQueue.isEmpty()) return;

    progressUpdateQueueActive = true;

    const [chunk_id, resolve, reject] = progressUpdateQueue.dequeue();

    try {
        await realUpdateChunkProgress(chunk_id);

        setSoon(() => {
            resolve();
        });
    } catch (e) {
        setSoon(() => {
            reject(e);
        });
    }

    setSoon(() => {
        processQueue();
    });

    progressUpdateQueueActive = false;
};

const realUpdateChunkProgress = async(chunk_id: string) => {
    // mark as completed in cache
    chunkUploadCache[chunk_id] = CHUNK_UPLOAD_STATUS.COMPLETED;

    // Ping all files to tell them that this chunk is done uploading and update progress %

    if (! chunkParents_useKeysAsFileIDs[chunk_id]) {
        // Strange that we have no records, so let's load them

        // From all filemaps get those that have this chunk_id and pluck file_ids
        const FileMap = require('../../db/models/file_map').default;
        const fileMaps = await FileMap.findAll({
            where: {chunk_id},
            attributes: ['file_id']
        });
        const file_ids = fileMaps.map((fm:FileMap) => fm.file_id);

        for (const file_id of file_ids) {
            addFileAsChunkParent(file_id, chunk_id);
        }
    }

    // Now update
    for (const file_id of Object.keys(chunkParents_useKeysAsFileIDs[chunk_id])) {
        await updateFileProgress(file_id);
    }
};

export const addFileAsChunkParent = async (file_id: string, chunk_id: string) => {
    if (! chunkParents_useKeysAsFileIDs[chunk_id]) chunkParents_useKeysAsFileIDs[chunk_id] = {};
    chunkParents_useKeysAsFileIDs[chunk_id][file_id] = true;
};
export const addDirAsFileParent = async (file_id: string, dir_id: string) => {
    if (! fileParents_useKeysAsDirIDs[file_id]) fileParents_useKeysAsDirIDs[file_id] = {};
    fileParents_useKeysAsDirIDs[file_id][dir_id] = true;
};
export const addDirAsDirParent = async (dir_id: string, parent_dir_id: string) => {
    if (! dirParents_useKeysAsDirIDs[dir_id]) dirParents_useKeysAsDirIDs[dir_id] = {};
    dirParents_useKeysAsDirIDs[dir_id][parent_dir_id] = true;
};

// This is where everything starts from the outside
export const updateChunkProgressAsCompleted = async(chunk_id: string) => new Promise((resolve, reject) => {
    progressUpdateQueue.enqueue([chunk_id, resolve, reject]);
    processQueue(); // eventually resolve or reject will be used
});

const updateFileUlStatus = async(file_id: string, ul_status: string, ul_progress: number) => {
    const File = require('../../db/models/file').default;
    let where = {id: file_id};
    if (ul_status === FILE_UPLOAD_STATUS.FAILED) {
        where = Object.assign({}, where, {ul_status: {[Sequelize.Op.notIn]: [FILE_UPLOAD_STATUS.COMPLETED]}});
    }
    await File.update({ul_status, ul_progress}, {where});
};
const updateFileDirUlStatus = async(file_id: string, dir_ul_status: string, dir_ul_progress: number) => {
    const File = require('../../db/models/file').default;
    let where = {id: file_id};
    if (dir_ul_status === FILE_DIR_UPLOAD_STATUS.FAILED) {
        where = Object.assign({}, where, {dir_ul_status: {[Sequelize.Op.notIn]: [FILE_DIR_UPLOAD_STATUS.COMPLETED]}});
    }
    await File.update({dir_ul_status, dir_ul_progress}, {where});
};

export const getDirProgress = async (dir_id: string): Promise<Record<string, number|string>> => {
    if (! dirUploadCache[dir_id]) {
        await updateDirProgress(dir_id);
    }

    const progress = dirUploadCache[dir_id].progress;

    const result = {
        id: dir_id,
        total: dirUploadCache[dir_id].dir_size,
        done: Math.round(progress * dirUploadCache[dir_id].dir_size)
    };

    return result;
};

export const markChunkUlStatusInCache = (chunk_id: string, status: string) => {
    chunkUploadCache[chunk_id] = status;
};

export const updateFileProgress = async (file_id: string, updateParentsAfterwards = true) => {
    log.trace({file_id}, 'updateFileProgress called');

    if (! file_id) throw new Error('Invalid file_id supplied to updateFileProgress');

    const Chunk = require('../../db/models/chunk').default;
    const FileMap = require('../../db/models/file_map').default;
    const File = require('../../db/models/file').default;

    if (! fileUploadCache[file_id]) {
        // if no information, fill it

        const filemaps = await FileMap.allBy('file_id', file_id);

        const file = await File.findOrFail(file_id);

        fileUploadCache[file_id] = {chunk_ids: [], uploaded: false, failed: false, progress: 0.0, size: file.size};
        for (const fm of filemaps) {
            fileUploadCache[file_id].chunk_ids.push(fm.chunk_id);
        }

        // If it's not there yet, add file as parent of its chunks
        for (const chunk_id of fileUploadCache[file_id].chunk_ids) {
            addFileAsChunkParent(file_id, chunk_id);
        }
    }

    if (fileUploadCache[file_id].uploaded) return; // already uploaded
    if (fileUploadCache[file_id].failed) return; // already failed

    const counters: Record<string, number> = {};
    let total = 0;

    // For each chunk, figure out its status
    for (const chunk_id of fileUploadCache[file_id].chunk_ids) {
        if (! chunkUploadCache[chunk_id]) {
            const chunk = await Chunk.findOrFail(chunk_id);
            chunkUploadCache[chunk_id] = chunk.ul_status;
        }

        counters[ chunkUploadCache[chunk_id] ] = (counters[ chunkUploadCache[chunk_id] ] || 0) + 1;
        total++;
    }

    let updated = false;

    // Count FAILED
    if (counters[CHUNK_UPLOAD_STATUS.FAILED] > 0) {
        fileUploadCache[file_id].uploaded = false;
        fileUploadCache[file_id].failed = true;
        updated = true;
        await updateFileUlStatus(file_id, FILE_UPLOAD_STATUS.FAILED, fileUploadCache[file_id].progress);
    } else {
        // Count COMPLETED
        if (counters[CHUNK_UPLOAD_STATUS.COMPLETED] === total) {
            fileUploadCache[file_id].uploaded = true;
            fileUploadCache[file_id].failed = false;
            fileUploadCache[file_id].progress = 1.0;
            updated = true;
            await updateFileUlStatus(file_id, FILE_UPLOAD_STATUS.COMPLETED, fileUploadCache[file_id].progress);

        } else {
            const progress = (total === 0) ? 0 : (counters[ CHUNK_UPLOAD_STATUS.COMPLETED ] || 0) / total;
            if (fileUploadCache[file_id].progress !== progress) {
                fileUploadCache[file_id].progress = progress;
                updated = true;
            } else {
                updated = false;
            }
        }
    }

    // Update all directories that contain this file
    // Use fileParents_useKeysAsFileIDs
    if (updated && updateParentsAfterwards && fileParents_useKeysAsDirIDs[file_id]) {
        for (const dir_id of Object.keys(fileParents_useKeysAsDirIDs[file_id])) {
            await updateDirProgress(dir_id);
        }
    }
};

export const updateDirProgress = async(dir_id: string, updateParentsAfterwards = true) => {
    log.trace({dir_id}, 'updateDirProgress called');

    if (! dir_id) throw new Error('Invalid dir_id supplied to updateDirProgress');

    const DirMap = require('../../db/models/dir_map').default;

    if (!dirUploadCache[dir_id]) {
        // if no information, fill it
        const dirmaps = await DirMap.allBy('dir_id', dir_id);

        dirUploadCache[dir_id] = {
            file_ids: [],
            is_dir: {},
            uploaded: false,
            failed: false,
            progress: 0.0,
            totalChunks: 0,
            dir_size: dirmaps.reduce((acc:number, dm:DirMap) => acc + (dm.dir_size), 0)
        };

        for (const dm of dirmaps) {
            dirUploadCache[dir_id].file_ids.push(dm.file_id);
            dirUploadCache[dir_id].is_dir[dm.file_id] = dm.is_dir;

            // If children were never pulled in, do it now
            if (dm.is_dir) {
                if (!dirUploadCache[dm.file_id]) {
                    await updateDirProgress(dm.file_id, false);
                }

                addDirAsDirParent(dm.file_id, dir_id);
            } else {
                // is a file

                if (!fileUploadCache[dm.file_id]) {
                    await updateFileProgress(dm.file_id, false);
                }

                addDirAsFileParent(dm.file_id, dir_id);
            }
        }
    }

    if (dirUploadCache[dir_id].uploaded) return; // already uploaded

    let uploadedFiles = 0;
    let failedFiles = 0;
    let totalFiles = 0;
    let uploadedChunks = 0;
    let totalChunks = 0;

    let updated = false;

    // For each file, figure out its status
    for (const file_id of dirUploadCache[dir_id].file_ids) {
        if (dirUploadCache[dir_id].is_dir[file_id]) {
            // It's a subdirectory
            if (!dirUploadCache[file_id]) {
                await updateDirProgress(file_id, false);
            }

            if (dirUploadCache[file_id].failed) {
                failedFiles++;
            }
            if (dirUploadCache[file_id].uploaded) {
                uploadedFiles++;
            }

            totalFiles++;

            // now chunks
            uploadedChunks += dirUploadCache[file_id].totalChunks * dirUploadCache[file_id].progress;
            totalChunks += dirUploadCache[file_id].totalChunks;

        } else {
            // It's a file

            if (!fileUploadCache[file_id]) {
                await updateFileProgress(file_id, false);
            }

            if (fileUploadCache[file_id].failed) {
                failedFiles++;
            }
            if (fileUploadCache[file_id].uploaded) {
                uploadedFiles++;
            }

            totalFiles++;

            // now chunks
            uploadedChunks += fileUploadCache[file_id].chunk_ids.length * fileUploadCache[file_id].progress;
            totalChunks += fileUploadCache[file_id].chunk_ids.length;
        }
    }

    // Count FAILED
    if (failedFiles > 0) {
        dirUploadCache[dir_id].uploaded = false;
        dirUploadCache[dir_id].failed = true;
        updated = true;
        await updateFileDirUlStatus(dir_id, FILE_DIR_UPLOAD_STATUS.FAILED, dirUploadCache[dir_id].progress);

    } else {
        // Count COMPLETED
        if (uploadedFiles === totalFiles) {
            dirUploadCache[dir_id].uploaded = true;
            dirUploadCache[dir_id].failed = false;
            dirUploadCache[dir_id].progress = 1.0;
            updated = true;
            await updateFileDirUlStatus(dir_id, FILE_DIR_UPLOAD_STATUS.COMPLETED, dirUploadCache[dir_id].progress);

        } else {
            const progress = (totalChunks === 0) ? 0 : uploadedChunks / totalChunks;
            if (dirUploadCache[dir_id].progress !== progress) {
                dirUploadCache[dir_id].progress = progress;
                // we don't update the database here because it's too slow, we just cache it, and only update on COMPLETED
                updated = true;
            } else {
                updated = false;
            }
        }
    }

    dirUploadCache[dir_id].totalChunks = totalChunks;

    //

    // Update parent dirs
    if (updated && updateParentsAfterwards && dirParents_useKeysAsDirIDs[dir_id]) {
        for (const parent_dir_id of Object.keys(dirParents_useKeysAsDirIDs[dir_id])) {
            await updateDirProgress(parent_dir_id);
        }
    }

};