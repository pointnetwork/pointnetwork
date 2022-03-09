import path from 'path';
import {SequelizeFactory} from './models/index';
import fs from 'fs';
export const sequelize = SequelizeFactory.init();

const basename = `${__dirname}/models`;

for (const file of fs.readdirSync(basename)) {
    if (file.indexOf('.') !== 0 && file !== 'index.js' && file.slice(-3) === '.js') {
        require(path.join(basename, file));
    }
}
