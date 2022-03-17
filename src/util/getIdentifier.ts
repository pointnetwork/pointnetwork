import path from 'path';
import fs from 'fs-extra';
import {nanoid} from 'nanoid';
import {resolveHome} from '../core/utils';
import config from 'config';

let identifier: string;

export function getIdentifier(): string {
    if (!identifier) {
        const liveProfilePath = path.join(resolveHome(config.get('datadir')), 'keystore', 'liveprofile');
        const identifierPath = path.join(liveProfilePath, 'identifier');
        if (!fs.existsSync(liveProfilePath)) {
            fs.mkdirpSync(liveProfilePath);
        }
        if (!fs.existsSync(identifierPath)) {
            identifier = nanoid();
            fs.writeFileSync(identifierPath, identifier);
        } else {
            identifier = fs.readFileSync(identifierPath, 'utf8');
        }
    }
    return identifier;
}
