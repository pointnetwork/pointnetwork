const Model = require('../model');
const Sequelize = require('sequelize');
let File = require('./file'), Chunk = require('./chunk');

class FileMap extends Model {
    constructor(...args) {
        super(...args);
    }
}

FileMap.init({
    id: { type: Sequelize.DataTypes.BIGINT, unique: true, primaryKey: true, autoIncrement: true },
    offset: { type: Sequelize.DataTypes.INTEGER },
}, {
    indexes: [
        { fields: ['chunk_id'] },
        { fields: ['file_id'] },
        { fields: ['file_id', 'chunk_id', 'offset'] }, // todo: unique
    ]
});

FileMap.belongsTo(File);
FileMap.belongsTo(Chunk);

module.exports = FileMap;
