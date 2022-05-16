import {resolveHome} from './resolveHome';
import path from 'path';
import fs from 'fs';
import config from 'config';

export async function getReferralCode() {
    const infoReferralPath = path.join(resolveHome(config.get('datadir')), 'infoReferral.json');
    try {
        await fs.promises.access(infoReferralPath, fs.constants.R_OK);
        const infoReferralJson = await fs.promises.readFile(infoReferralPath, 'utf8');
        return JSON.parse(infoReferralJson).referralCode;
    } catch (error) {}
}
