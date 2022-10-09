const Model = require('./base');
const Sequelize = require('sequelize');
import {processQueue, EventTypes} from '../../client/storage/callbacks';
import logger from '../../core/log';
const log = logger.child({module: 'File model'});

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

class File extends Model {
    declare id: string;
    declare size: number;
    declare chunk_ids: Array<string> | null;
    declare ul_status: string;
    declare dl_status: string;
    declare expires: number;

    constructor(...args: any[]) {
        super(...args);
    }
}

File.init(
    {
        id: {type: Sequelize.DataTypes.STRING, unique: true, primaryKey: true},
        size: {type: Sequelize.DataTypes.INTEGER, allowNull: true},
        chunk_ids: {type: Sequelize.DataTypes.JSON, allowNull: true},
        dl_status: {
            type: Sequelize.DataTypes.STRING,
            defaultValue: FILE_DOWNLOAD_STATUS.NOT_STARTED
        },
        ul_status: {
            type: Sequelize.DataTypes.STRING,
            defaultValue: FILE_UPLOAD_STATUS.NOT_STARTED
        },
        expires: {type: Sequelize.DataTypes.BIGINT, allowNull: true}
    },
    {
        indexes: [
            {fields: ['ul_status']},
            {fields: ['dl_status']}
        ]
    }
);

const modificationHook = (m: File) => {
    if (m.changed().includes('ul_status')) {
        processQueue(EventTypes.FILE_UPLOAD_STATUS_CHANGED, m.id);
    }
    if (m.changed().includes('dl_status')) {
        processQueue(EventTypes.FILE_DOWNLOAD_STATUS_CHANGED, m.id);
    }
};

File.addHook('afterDestroy', (m: File) => modificationHook(m));
File.addHook('afterUpdate', (m: File) => modificationHook(m));
File.addHook('afterSave', (m: File) => modificationHook(m));
File.addHook('afterUpsert', (m: [File, boolean | null]) => modificationHook(m[0]));

export {File as default};
