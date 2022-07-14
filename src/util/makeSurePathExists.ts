import {promises as fs} from 'fs';
import {statAsync} from './statAsync';

export const makeSurePathExists = async (pathToCheck: string, createIfNotExists = false) => {
    try {
        await statAsync(pathToCheck);
    } catch (e) {
        if (e.code === 'ENOENT' && createIfNotExists) {
            await fs.mkdir(pathToCheck, {recursive: true});
        } else {
            throw e;
        }
    }
};

/**
 * Reads the `key.json` file, parses it and validates that it has a
 * `phrase` key with a 12-word string. It throws if it does not.
 */
export const makeSureKeyfileHasPhrase = async (filepath: string) => {
    try {
        const str = await fs.readFile(filepath, 'utf8');
        const {phrase} = JSON.parse(str);
        if (!phrase || phrase.split(/\s/g).length !== 12) {
            throw new Error(`${filepath} has a missing or invalid "phrase".`);
        }
    } catch (err) {
        throw err;
    }
};
