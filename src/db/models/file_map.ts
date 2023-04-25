const Model = require('./base');
const Sequelize = require('sequelize');

class FileMap extends Model<{
    id: string;
    file_id: string;
    chunk_id: string;
    offset: number;
}> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]) {
        super(...args);
    }
}

FileMap.init(
    {
        id: {type: Sequelize.DataTypes.BIGINT, autoIncrement: true, unique: true, primaryKey: true},
        file_id: {type: Sequelize.DataTypes.STRING, allowNull: false},
        chunk_id: {type: Sequelize.DataTypes.STRING, allowNull: false},
        offset: {type: Sequelize.DataTypes.BIGINT, allowNull: false}
    },
    {
        indexes: [
            {fields: ['chunk_id']},
            {fields: ['file_id']},
            {fields: ['file_id', 'chunk_id']},
            {fields: ['file_id', 'offset']},
            {fields: ['file_id', 'chunk_id', 'offset'], unique: true}
        ]
    }
);

export {FileMap as default};
