import path from 'path';
import {HttpNotFoundError} from '../core/exceptions.js';
import fs from 'fs';

export const readFileByPath = async (localRoot: string, filePath: string, encoding = 'utf-8') => fs.promises.readFile(getFullPathFromLocalRoot(localRoot, filePath), encoding as 'utf8');

export const getFullPathFromLocalRoot = (localRoot: string, filePath: string) => {
    const fullPath = path.join(localRoot, filePath);

    // Poison null bytes https://nodejs.org/en/knowledge/file-system/security/introduction/#poison-null-bytes
    if (filePath.indexOf('\0') !== -1) {
        throw Error('Null bytes are not allowed');
    }

    // Preventing directory traversal https://nodejs.org/en/knowledge/file-system/security/introduction/#preventing-directory-traversal
    // Must be after poison null bytes check
    if (fullPath.indexOf(localRoot) !== 0) {
        throw Error('Directory traversal is not allowed');
    }

    try {
        fs.statSync(fullPath);
    } catch (e) {
        throw new HttpNotFoundError('This route or file is not found');
    }

    return fullPath;
};
