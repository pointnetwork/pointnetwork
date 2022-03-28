import {promisify} from 'util';
import {stat} from 'fs';

// we need to use this custom made statAsync function rather than the one from fs-promises since
// it's failing when using inside vercel/pkg package

export const statAsync = promisify(stat);
