import path from 'path';
import {promises as fs} from 'fs';
import {statAsync} from '../util';

async function upload(assetPath: string) {
    const {uploadFile, uploadDir} = require('../client/storage');
    const init = require('../client/storage/init');

    await init.default();

    const absPath = path.isAbsolute(assetPath)
        ? assetPath
        : path.resolve(__dirname, '..', '..', assetPath);

    let id: number;

    const stat = await statAsync(absPath);
    if (stat.isDirectory()) {
        id = await uploadDir(absPath);
    } else {
        const file = await fs.readFile(absPath);
        id = await uploadFile(file);
    }

    return id;
}

export default upload;
