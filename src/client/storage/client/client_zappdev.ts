import Arweave from 'arweave';
import {HOST, log, MODE, PORT, PROTOCOL} from '../config.js';
import path from 'path';
import config from 'config';
import fs from 'fs';
import {JWKInterface} from 'arweave/node/lib/wallet';
import {resolveHome} from '../../../util/index.js';

const arweave = Arweave.init({
    port: PORT,
    protocol: PROTOCOL,
    host: HOST
});

// load the arweave key for arlocal
const keystorePath: string = resolveHome(config.get('wallet.keystore_path'));
const arweaveKeyPath = path.join(keystorePath, 'arweave.json');
let arweaveKey: JWKInterface | undefined = undefined;
try {
    arweaveKey = JSON.parse(fs.readFileSync(arweaveKeyPath, 'utf8'));
} catch (e) {
    if (MODE === 'zappdev') {
        log.warn('No arweave key found');
    }
}
export {arweaveKey};

export default arweave;
