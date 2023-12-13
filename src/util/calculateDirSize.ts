import {statAsync} from './statAsync';
import {promises as fs} from 'fs';
import path from 'path';

export const calculateDirSize = async (dirPath: string): Promise<number> => {
    const stat = await statAsync(dirPath);
    if (stat.isDirectory()) {
        const files = await fs.readdir(dirPath);
        const sizes = await Promise.all(files.map(
            filePath => calculateDirSize(path.join(dirPath, filePath))
        ));
        return sizes.reduce((acc, cur) => acc + cur, 0);
    } else {
        return stat.size;
    }
};
