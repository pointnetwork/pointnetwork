import path from 'path';
import {promises as fs} from 'fs';
import {HttpNotFoundError} from '../core/exceptions';

export const readFileByPath = async (localRoot: string, filePath: string, encoding = 'utf-8') => {
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
        await fs.stat(fullPath);
    } catch (e) {
        throw new HttpNotFoundError('This route or file is not found');
    }
    return fs.readFile(fullPath, encoding as 'utf8');
};
