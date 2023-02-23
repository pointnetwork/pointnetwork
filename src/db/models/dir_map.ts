const Model = require('./base');
const Sequelize = require('sequelize');
import _ from 'lodash';

class DirMap extends Model<{
    id: string;
    dir_id: string;
    file_id: string;
    dir_size: number;
    is_dir: boolean;
    offset: number;
}> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]) {
        super(...args);
    }

    public static async getAllDirsContainingFileId(fileId: string) {
        const File = require('./file').default;
        const maps = await this.allBy('file_id', fileId);
        let dir_ids = [];
        for (const map of maps) {
            dir_ids.push(map.dir_id);
        }
        dir_ids = _.uniq(dir_ids);

        const dirs = [];
        for (const dir_id of dir_ids) {
            dirs.push(await File.findOrFail(dir_id));
        }
        return dirs;
    }
}

DirMap.init(
    {
        id: {type: Sequelize.DataTypes.BIGINT, autoIncrement: true, unique: true, primaryKey: true},
        dir_id: {type: Sequelize.DataTypes.STRING, allowNull: false},
        file_id: {type: Sequelize.DataTypes.STRING, allowNull: false},
        offset: {type: Sequelize.DataTypes.BIGINT, allowNull: false},
        dir_size: {type: Sequelize.DataTypes.BIGINT, allowNull: false},
        is_dir: {type: Sequelize.DataTypes.BOOLEAN, allowNull: false}
    },
    {
        indexes: [
            {fields: ['file_id']},
            {fields: ['dir_id']},
            {fields: ['dir_id', 'file_id']},
            {fields: ['dir_id', 'offset']},
            {fields: ['dir_id', 'file_id', 'offset'], unique: true}
        ]
    }
);

export {DirMap as default};
