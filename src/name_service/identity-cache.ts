import {IdentityData} from './types';
import {CacheFactory} from '../util';

const expiration = 5 * 60 * 1_000;

export const identityCache = new CacheFactory<string, IdentityData>(expiration);
