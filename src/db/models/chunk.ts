import {processQueue, EventTypes} from '../../client/storage/callbacks';
import logger from '../../core/log';

const Model = require('./base');
const Sequelize = require('sequelize');
const log = logger.child({module: 'Chunk model'});

export const CHUNK_DOWNLOAD_STATUS = {
    NOT_STARTED: 'NOT_STARTED',
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

class Chunk extends Model {
    declare id: string;
    declare size: number;
    declare ul_status: string;
    declare dl_status: string;
    declare retry_count: number;
    declare validation_retry_count: number;
    declare txid: string | null;
    declare expires: number | null;

    constructor(...args: any[]) {
        super(...args);
    }

    isExpired() {
        return this.expires !== null && this.expires < new Date().getTime();
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

const modificationHook = (m: Chunk) => {
    if (m.changed().includes('ul_status')) {
        processQueue(EventTypes.CHUNK_UPLOAD_STATUS_CHANGED, m.id);
    }
    if (m.changed().includes('dl_status')) {
        processQueue(EventTypes.CHUNK_DOWNLOAD_STATUS_CHANGED, m.id);
    }
};

Chunk.addHook('afterDestroy', (m: Chunk) => modificationHook(m));
Chunk.addHook('afterUpdate', (m: Chunk) => modificationHook(m));
Chunk.addHook('afterSave', (m: Chunk) => modificationHook(m));
Chunk.addHook('afterUpsert', (m: [ Chunk, boolean | null ]) => modificationHook(m[0]));

export {Chunk as default};
