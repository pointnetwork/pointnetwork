const Model = require('./base');
const Sequelize = require('sequelize');

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
    constructor(...args) {
        super(...args);
    }
}

File.init(
    {
        id: {type: Sequelize.DataTypes.STRING, unique: true, primaryKey: true},
        size: {type: Sequelize.DataTypes.INTEGER, allowNull: true},
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

export {File as default};
