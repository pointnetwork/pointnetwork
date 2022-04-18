import path from 'path';
import os from 'os';

export const resolveHome = (filepath: string) => {
    if (filepath[0] === '~') {
        return path.join(process.env.HOME || os.homedir(), filepath.slice(1));
    }
    return filepath;
};
