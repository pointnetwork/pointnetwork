const Model = require('./base');
const Sequelize = require('sequelize');
import {processQueue, EventTypes} from '../../client/storage/callbacks.js';
import {UPLOAD_RETRY_LIMIT} from '../../client/storage/config.js';
import {markChunkUlStatusInCache} from '../../client/storage/progress.js';

export const CHUNK_DOWNLOAD_STATUS = {
    NOT_STARTED: 'NOT_STARTED',
    ENQUEUED: 'ENQUEUED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED'
};

export const CHUNK_UPLOAD_STATUS = {
    NOT_STARTED: 'NOT_STARTED',
    ENQUEUED: 'ENQUEUED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    VALIDATING: 'VALIDATING',
    FAILED: 'FAILED'
};

class Chunk extends Model<{
    id: string;
    size: number;
    dl_status: string;
    ul_status: string;
    retry_count: number;
    validation_retry_count: number;
    txid: string | null;
    expires: number | null;
}> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]) {
        super(...args);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async update(fields: Record<string, unknown>, options: any, ...args: any[]) {
        await super.update(fields, options, ...args);

        if (fields.ul_status && options.where && options.where.id) {
            processQueue(EventTypes.CHUNK_UPLOAD_STATUS_CHANGED, options.where.id);
        }
        if (fields.dl_status && options.where && options.where.id) {
            processQueue(EventTypes.CHUNK_DOWNLOAD_STATUS_CHANGED, options.where.id);
        }
    }

    isExpired() {
        return this.expires !== null && this.expires < new Date().getTime();
    }

    async markAsFailedOrRestart() {
        const chunk = await Chunk.findOrFail(this.id);

        if (chunk.ul_status === CHUNK_UPLOAD_STATUS.IN_PROGRESS) {
            const retry_count = chunk.retry_count + 1;

            let ul_status;
            if (chunk.retry_count >= UPLOAD_RETRY_LIMIT) {
                ul_status = CHUNK_UPLOAD_STATUS.FAILED;
            } else {
                // still has retries, re-enqueue
                ul_status = CHUNK_UPLOAD_STATUS.ENQUEUED;
            }

            await Chunk.update({ul_status, retry_count}, {
                where: {
                    id: chunk.id,
                    ul_status: CHUNK_UPLOAD_STATUS.IN_PROGRESS
                }
            });
        } else {
            // we fell out of sync
            // don't touch the chunk row
        }
    }
}

Chunk.init(
    {
        id: {type: Sequelize.DataTypes.STRING, unique: true, primaryKey: true},
        size: {type: Sequelize.DataTypes.INTEGER, allowNull: true},
        dl_status: {
            type: Sequelize.DataTypes.STRING,
            defaultValue: CHUNK_DOWNLOAD_STATUS.NOT_STARTED
        },
        ul_status: {
            type: Sequelize.DataTypes.STRING,
            defaultValue: CHUNK_UPLOAD_STATUS.NOT_STARTED
        },
        retry_count: {type: Sequelize.DataTypes.INTEGER, defaultValue: 0},
        validation_retry_count: {type: Sequelize.DataTypes.INTEGER, defaultValue: 0},
        txid: {type: Sequelize.DataTypes.STRING, allowNull: true},
        expires: {type: Sequelize.DataTypes.BIGINT, allowNull: true}
    },
    {
        indexes: [
            {fields: ['ul_status']},
            {fields: ['dl_status']}
        ]
    }
);

// NOTE: These hooks are not working when using .update(). Had to hook into ::update() method

const modificationHook = (m: Chunk) => {
    if (m.changed() && m.changed().includes('ul_status')) {
        markChunkUlStatusInCache(m.id, m.changed().ul_status);
        processQueue(EventTypes.CHUNK_UPLOAD_STATUS_CHANGED, m.id);
    }
    if (m.changed() && m.changed().includes('dl_status')) {
        processQueue(EventTypes.CHUNK_DOWNLOAD_STATUS_CHANGED, m.id);
    }
};

Chunk.addHook('afterDestroy', (m: Chunk) => modificationHook(m));
Chunk.addHook('afterUpdate', (m: Chunk) => modificationHook(m));
Chunk.addHook('afterSave', (m: Chunk) => modificationHook(m));
Chunk.addHook('afterUpsert', (m: [ Chunk, boolean | null ]) => modificationHook(m[0]));

export {Chunk as default};
