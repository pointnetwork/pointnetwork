import File from './file';
import Identity from './identity';
import Chunk from './chunk';
import {Database} from '../index';
const sequelize = Database.client;

export {File, Identity, Chunk, Database, sequelize};
