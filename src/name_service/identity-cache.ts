import {IdentityData} from './types';
import {CacheFactory} from '../util';

const expiration = 5 * 60 * 1_000;

export const identityCache = new CacheFactory<string, IdentityData>(expiration);

/**
 * Utility function to create an identity record and add it to the cache.
 */
export function addToCache({
    address,
    identity,
    publicKey,
    network
}: {
    address: string;
    identity: string;
    publicKey: string;
    network: 'point' | 'solana' | 'ethereum';
}) {
    const cacheKey = `point:${address}`;
    const identityRecord: IdentityData = {identity, address, publicKey, network};
    identityCache.add(cacheKey, identityRecord);
}
