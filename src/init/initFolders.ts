import path from 'path';
import config from 'config';
import {resolveHome, makeSurePathExists, makeSureKeyfileHasPhrase} from '../util';

const initFolders = async () => {
    const datadir: string = resolveHome(config.get('datadir'));
    const keystore = resolveHome(config.get('wallet.keystore_path'));
    try {
        await makeSurePathExists(datadir);
    } catch (e) {
        throw new Error(
            'Datadir folder does not exist. Did you create it? Please, refer to this guide: https://github.com/pointnetwork/pointnetwork-dashboard/blob/main/ALPHA.md'
        );
    }

    try {
        await makeSurePathExists(keystore);
    } catch (e) {
        throw new Error(
            'Keystore folder does not exist. Did you create it? Please, refer to this guide: https://github.com/pointnetwork/pointnetwork-dashboard/blob/main/ALPHA.md'
        );
    }

    try {
        await makeSureKeyfileHasPhrase(path.join(keystore, 'key.json'));
    } catch (e) {
        throw new Error(
            'key.json file does not exist or is invalid. Please, refer to this guide: https://github.com/pointnetwork/pointnetwork-dashboard/blob/main/ALPHA.md'
        );
    }

    const nestedFolders = [
        path.join(datadir, config.get('deployer.cache_path')),
        path.join(datadir, config.get('storage.upload_cache_path')),
        path.join(datadir, config.get('storage.download_cache_path')),
        path.join(datadir, config.get('storage.files_path')),
        path.join(datadir, config.get('network.contracts_path'))
    ];

    await Promise.all(nestedFolders.map(f => makeSurePathExists(f, true)));
};

export default initFolders;
