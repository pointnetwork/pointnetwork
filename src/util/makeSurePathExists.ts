import {promises as fs} from 'fs';

export const makeSurePathExists = async (pathToCheck: string, createIfNotExists = false) => {
    try {
        await fs.stat(pathToCheck);
    } catch (e) {
        if (e.code === 'ENOENT' && createIfNotExists) {
            await fs.mkdir(pathToCheck, {recursive: true});
        } else {
            throw e;
        }
    }
};
