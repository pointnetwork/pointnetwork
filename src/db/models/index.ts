import File from './file.js';
const Identity = require('./identity.js');
import Chunk from './chunk.js';
import FileMap from './file_map.js';
import DirMap from './dir_map.js';
import {Database} from '../index.js';
const sequelize = Database.client;

// todo: remove completely
// const oldSequelizeTx = sequelize.transaction;
// let activeTxCount = 0;
// sequelize.transaction = async function(...args) {
//     const rnd = Math.floor(Math.random() * 1000);
//     const fn = args[0].toString().replace(/\n/g, '').substr(0, 200);
//     activeTxCount++;
//     console.log('transaction '+rnd+' started', {activeTxCount}, fn);
//     // const bind = oldSequelizeTx.bind(sequelize, ...args);
//     // const result = await bind();
//
//     const result = args[0]({uuid: null, LOCK: {
//         UPDATE: 'UPDATE',
//         SHARE: 'SHARE',
//         KEY_SHARE: 'KEY SHARE',
//         NO_KEY_UPDATE: 'NO KEY UPDATE',
//     }});
//
//     activeTxCount--;
//     console.log('transaction '+rnd+' ended', {activeTxCount}, fn);
//     return result;
// }

// Dependencies
File.belongsToMany(Chunk, {through: FileMap});
Chunk.belongsToMany(File, {through: FileMap});
FileMap.belongsTo(Chunk);
FileMap.belongsTo(File);
File.hasMany(FileMap);
Chunk.hasMany(FileMap);

export {File, Identity, Chunk, Database, FileMap, DirMap, sequelize};
