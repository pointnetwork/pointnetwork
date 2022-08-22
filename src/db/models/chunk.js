const Model = require('./base');
const Sequelize = require('sequelize');

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
    constructor(...args) {
        super(...args);
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

export {Chunk as default};
