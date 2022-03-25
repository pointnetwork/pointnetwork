import {promisify} from 'util';
import {stat} from 'fs';

export const statAsync = promisify(stat);
