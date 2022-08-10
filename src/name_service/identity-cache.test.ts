import {IdentityCache} from './identity-cache';
import {IdentityData} from './types';

let cache: IdentityCache;
beforeEach(() => (cache = new IdentityCache(200)));

const sleep = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout));

describe('IdentityCache', () => {
    const identityA: IdentityData = {
        identity: 'A',
        address: 'blockchain-address-of-identity-a',
        publicKey: 'publick-key-of-identity-a',
        network: 'point'
    };

    const identityB: IdentityData = {
        identity: 'B',
        address: 'blockchain-address-of-identity-b',
        publicKey: 'publick-key-of-identity-b',
        network: 'ethereum'
    };

    const identityC: IdentityData = {
        identity: 'C',
        address: 'blockchain-address-of-identity-c',
        publicKey: 'publick-key-of-identity-c',
        network: 'solana'
    };

    it('should add two entries', () => {
        expect.assertions(1);
        cache.add(identityA.address, identityA);
        cache.add(identityB.address, identityB);
        expect(cache.size()).toEqual(2);
    });

    it('should overwrite older entry with same key and not add duplicates', () => {
        expect.assertions(2);
        const k = identityA.address;
        cache.add(k, identityB);
        cache.add(k, identityA);
        expect(cache.size()).toEqual(1);
        expect(cache.get(k)?.identity).toEqual(identityA.identity);
    });

    it('should return the correct entry when it is present and not expired', () => {
        expect.assertions(4);
        const k = identityC.address;
        cache.add(k, identityC);
        expect(cache.get(k)?.identity).toEqual(identityC.identity);
        expect(cache.get(k)?.address).toEqual(identityC.address);
        expect(cache.get(k)?.publicKey).toEqual(identityC.publicKey);
        expect(cache.get(k)?.network).toEqual(identityC.network);
    });

    it('should return correct entry after a period of time but before expiration', async () => {
        expect.assertions(1);
        const k = identityC.address;
        cache.add(k, identityC);
        await sleep(100);
        expect(cache.get(k)?.identity).toEqual(identityC.identity);
    });

    it('should return null when entry is not present', () => {
        expect.assertions(1);
        expect(cache.get(identityC.address)).toBeNull();
    });

    it('should return null when entry is expired', async () => {
        expect.assertions(3);
        const k = identityC.address;
        cache.add(k, identityC);
        expect(cache.size()).toEqual(1);
        await sleep(250);
        expect(cache.get(k)).toBeNull();
        expect(cache.size()).toEqual(0);
    });

    it('should return true when an entry is present and not expired', () => {
        expect.assertions(1);
        const k = identityA.address;
        cache.add(k, identityA);
        expect(cache.has(k)).toEqual(true);
    });

    it('should return true after a period of time but before expiration', async () => {
        expect.assertions(1);
        const k = identityA.address;
        cache.add(k, identityA);
        await sleep(100);
        expect(cache.has(k)).toBe(true);
    });

    it('should return false when an entry is not present', () => {
        expect.assertions(1);
        expect(cache.has(identityA.address)).toBe(false);
    });

    it('should return false when an entry is expired', async () => {
        expect.assertions(2);
        const k = identityA.address;
        cache.add(k, identityA);
        await sleep(250);
        expect(cache.has(k)).toBe(false);
        expect(cache.size()).toEqual(0);
    });

    it('should remove all expired entries', async () => {
        expect.assertions(4);
        cache.add(identityA.address, identityA);
        cache.add(identityB.address, identityB);
        await sleep(100);
        cache.add(identityC.address, identityC);
        await sleep(150);
        cache.clear();
        expect(cache.size()).toEqual(1);
        expect(cache.has(identityA.address)).toBe(false);
        expect(cache.has(identityB.address)).toBe(false);
        expect(cache.has(identityC.address)).toBe(true);
    });

    it('should remove all entries', async () => {
        expect.assertions(1);
        cache.add(identityA.address, identityA);
        cache.add(identityB.address, identityB);
        await sleep(250);
        cache.add(identityC.address, identityC);
        cache.drop();
        expect(cache.size()).toEqual(0);
    });

    it('should serialize cache to JSON string', () => {
        expect.assertions(1);
        const k = identityA.address;
        cache.add(k, identityA);
        const str = cache.toJSON();
        const obj = JSON.parse(str);
        expect(obj[k].entry.identity).toEqual(identityA.identity);
    });
});
