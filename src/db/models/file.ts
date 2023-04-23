const Model = require('./base');
const Sequelize = require('sequelize');
import {processQueue, EventTypes} from '../../client/storage/callbacks';

export const FILE_DOWNLOAD_STATUS = {
    NOT_STARTED: 'NOT_STARTED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED'
};

export const FILE_UPLOAD_STATUS = {
    NOT_STARTED: 'NOT_STARTED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED'
};

export const FILE_DIR_UPLOAD_STATUS = {
    NOT_STARTED: 'NOT_STARTED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED'
};

class File extends Model<{
    id: string;
    size: number;
    chunk_ids: Array<string> | null;
    ul_status: string;
    dl_status: string;
    ul_progress: number;
    dl_progress: number;
    expires: number;
}> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]) {
        super(...args);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async update(fields: Record<string, unknown>, options: any, ...args: any[]) {
        await super.update(fields, options, ...args);

        if (fields.ul_status && options.where && options.where.id) {
            processQueue(EventTypes.FILE_UPLOAD_STATUS_CHANGED, options.where.id);
        }
        if (fields.dir_ul_status && options.where && options.where.id) {
            processQueue(EventTypes.FILE_DIR_UPLOAD_STATUS_CHANGED, options.where.id);
        }
        if (fields.dl_status && options.where && options.where.id) {
            processQueue(EventTypes.FILE_DOWNLOAD_STATUS_CHANGED, options.where.id);
        }
    }
}

File.init(
    {
        id: {type: Sequelize.DataTypes.STRING, unique: true, primaryKey: true},
        size: {type: Sequelize.DataTypes.BIGINT, allowNull: true},
        chunk_ids: {type: Sequelize.DataTypes.JSON, allowNull: true},
        dl_status: {
            type: Sequelize.DataTypes.STRING,
            defaultValue: FILE_DOWNLOAD_STATUS.NOT_STARTED
        },
        ul_status: {
            type: Sequelize.DataTypes.STRING,
            defaultValue: FILE_UPLOAD_STATUS.NOT_STARTED
        },
        dl_progress: {type: Sequelize.DataTypes.FLOAT, allowNull: false, defaultValue: 0},
        ul_progress: {type: Sequelize.DataTypes.FLOAT, allowNull: false, defaultValue: 0},
        expires: {type: Sequelize.DataTypes.BIGINT, allowNull: true},
        dir_ul_progress: {type: Sequelize.DataTypes.FLOAT, allowNull: false, defaultValue: 0},
        dir_ul_status: {
            type: Sequelize.DataTypes.STRING,
            defaultValue: FILE_DIR_UPLOAD_STATUS.NOT_STARTED
        }
    },
    {
        indexes: [
            {fields: ['ul_status']},
            {fields: ['dl_status']},
            {fields: ['dir_ul_status']}
        ]
    }
);

// NOTE: These hooks are not working when using .update(). Had to hook into ::update() method

const modificationHook = (m: File) => {
    if (m.changed() && m.changed().includes('ul_status')) {
        processQueue(EventTypes.FILE_UPLOAD_STATUS_CHANGED, m.id);
    }
    if (m.changed() && m.changed().includes('dir_ul_status')) {
        processQueue(EventTypes.FILE_DIR_UPLOAD_STATUS_CHANGED, m.id);
    }
    if (m.changed() && m.changed().includes('dl_status')) {
        processQueue(EventTypes.FILE_DOWNLOAD_STATUS_CHANGED, m.id);
    }
};

File.addHook('afterDestroy', (m: File) => modificationHook(m));
File.addHook('afterUpdate', (m: File) => modificationHook(m));
File.addHook('afterSave', (m: File) => modificationHook(m));
File.addHook('afterUpsert', (m: [File, boolean | null]) => modificationHook(m[0]));

export {File as default};
