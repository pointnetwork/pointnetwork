const Model = require('../model');
const Sequelize = require('sequelize');

// We are using one status for both upload and download, because, since file's id is its
// data hash, if file is downloaded, then it's also uploaded, and vice versa
// TODO: apply migration and rename dl_status to status to avoid confusion
// TODO: import from storage, now having problems with circular dependencies
const DOWNLOAD_UPLOAD_STATUS = {
    NOT_STARTED: 'NOT_STARTED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED'
};

class File extends Model {
    constructor(...args) {
        super(...args);
    }
}

File.init(
    {
        id: {type: Sequelize.DataTypes.STRING, unique: true, primaryKey: true},
        original_path: {type: Sequelize.DataTypes.TEXT},
        size: {type: Sequelize.DataTypes.INTEGER, allowNull: true},
        dl_status: {
            type: Sequelize.DataTypes.STRING,
            defaultValue: DOWNLOAD_UPLOAD_STATUS.NOT_STARTED
        },

        // TODO: not used, remove
        ul_status: {type: Sequelize.DataTypes.STRING, defaultValue: ''},
        chunkIds: {type: Sequelize.DataTypes.JSON, allowNull: true},
        redundancy: {type: Sequelize.DataTypes.INTEGER, allowNull: true},
        expires: {type: Sequelize.DataTypes.BIGINT, allowNull: true},
        autorenew: {type: Sequelize.DataTypes.BOOLEAN, allowNull: true}
    },
    {
        indexes: [
            {fields: ['ul_status']}, // TODO: remove
            {fields: ['dl_status']}
        ]
    }
);

module.exports = File;
