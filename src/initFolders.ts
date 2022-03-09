import {makeSurePathExists} from './core/utils';
import path from 'path';
import config from 'config';

const initFolders = async () => {
    const datadir: string = config.get('datadir');
    try {
        await makeSurePathExists(datadir);
    } catch (e) {
        throw new Error('Datadir folder does not exist. Did you create it? Please, refer to this guide: https://github.com/pointnetwork/pointnetwork-dashboard/blob/main/ALPHA.md');
    }

    try {
        await makeSurePathExists(config.get('wallet.keystore_path'));
    } catch (e) {
        throw new Error('Keystore folder does not exist. Did you create it? Please, refer to this guide: https://github.com/pointnetwork/pointnetwork-dashboard/blob/main/ALPHA.md');
    }

    try {
        await makeSurePathExists(path.join(config.get('wallet.keystore_path'), 'key.json'));
    } catch (e) {
        throw new Error('key.json file does not exist. Did you create it? Please, refer to this guide: https://github.com/pointnetwork/pointnetwork-dashboard/blob/main/ALPHA.md');
    }

    const nestedFolders = [
        path.join(datadir, config.get('deployer.cache_path')),
        path.join(datadir, config.get('storage.upload_cache_path')),
        path.join(datadir, config.get('storage.download_cache_path')),
        path.join(datadir, config.get('storage.files_path'))
    ];

    await Promise.all(nestedFolders.map(f => makeSurePathExists(f, true)));
};

export default initFolders;
