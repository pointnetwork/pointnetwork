import path from 'path';
import fs from 'fs-extra';
import config from 'config';
import {resolveHome} from '.';

export const getSecretToken = async () => (await fs.readFile(
    path.join(resolveHome(config.get('wallet.keystore_path')), 'token.txt'), 'utf8'
)).trim();
