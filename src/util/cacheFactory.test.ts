import {CacheFactory} from './cacheFactory';

interface Item {
    id: string;
    name: string;
}

let cache: CacheFactory<string, Item>;
beforeEach(() => (cache = new CacheFactory<string, Item>(200)));

const sleep = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout));

describe('CacheFactory', () => {
    const items: Item[] = [
        {id: 'Udaophe4', name: 'test-item-a'},
        {id: 'lixieNg7', name: 'test-item-b'},
        {id: 'Etha4paw', name: 'test-item-c'}
    ];

    it('should add two entries', () => {
        expect.assertions(1);
        cache.add(items[0].id, items[0]);
        cache.add(items[1].id, items[1]);
        expect(cache.size()).toEqual(2);
    });

    it('should overwrite older entry with same key and not add duplicates', () => {
        expect.assertions(2);
        const k = items[0].id;
        cache.add(k, items[1]);
        cache.add(k, items[0]);
        expect(cache.size()).toEqual(1);
        expect(cache.get(k)).toEqual(items[0]);
    });

    it('should return the correct entry when it is present and not expired', () => {
        expect.assertions(2);
        const k = items[2].id;
        cache.add(k, items[2]);
        expect(cache.get(k)?.id).toEqual(items[2].id);
        expect(cache.get(k)?.name).toEqual(items[2].name);
    });

    it('should return correct entry after a period of time but before expiration', async () => {
        expect.assertions(1);
        const k = items[2].id;
        cache.add(k, items[2]);
        await sleep(100);
        expect(cache.get(k)).toEqual(items[2]);
    });

    it('should return null when entry is not present', () => {
        expect.assertions(1);
        expect(cache.get(items[2].id)).toBeNull();
    });

    it('should return null when entry is expired', async () => {
        expect.assertions(3);
        const k = items[2].id;
        cache.add(k, items[2]);
        expect(cache.size()).toEqual(1);
        await sleep(250);
        expect(cache.get(k)).toBeNull();
        expect(cache.size()).toEqual(0);
    });

    it('should return true when an entry is present and not expired', () => {
        expect.assertions(1);
        const k = items[0].id;
        cache.add(k, items[0]);
        expect(cache.has(k)).toEqual(true);
    });

    it('should return true after a period of time but before expiration', async () => {
        expect.assertions(1);
        const k = items[0].id;
        cache.add(k, items[0]);
        await sleep(100);
        expect(cache.has(k)).toBe(true);
    });

    it('should return false when an entry is not present', () => {
        expect.assertions(1);
        expect(cache.has(items[0].id)).toBe(false);
    });

    it('should return false when an entry is expired', async () => {
        expect.assertions(2);
        const k = items[0].id;
        cache.add(k, items[0]);
        await sleep(250);
        expect(cache.has(k)).toBe(false);
        expect(cache.size()).toEqual(0);
    });

    it('should remove all expired entries', async () => {
        expect.assertions(4);
        cache.add(items[0].id, items[0]);
        cache.add(items[1].id, items[1]);
        await sleep(100);
        cache.add(items[2].id, items[2]);
        await sleep(150);
        cache.clear();
        expect(cache.size()).toEqual(1);
        expect(cache.has(items[0].id)).toBe(false);
        expect(cache.has(items[1].id)).toBe(false);
        expect(cache.has(items[2].id)).toBe(true);
    });

    it('should remove all entries', async () => {
        expect.assertions(1);
        cache.add(items[0].id, items[0]);
        cache.add(items[1].id, items[1]);
        await sleep(250);
        cache.add(items[2].id, items[2]);
        cache.drop();
        expect(cache.size()).toEqual(0);
    });

    it('should remove a single entry', async () => {
        expect.assertions(2);
        cache.add(items[0].id, items[0]);
        cache.add(items[1].id, items[1]);
        expect(cache.size()).toEqual(2);
        cache.rm(items[0].id);
        expect(cache.size()).toEqual(1);
    });

    it('should return Object representation of cache', () => {
        expect.assertions(2);
        cache.add(items[2].id, items[2]);
        cache.add(items[1].id, items[1]);
        const obj = cache.toObj();
        expect(obj[items[1].id].entry).toEqual(items[1]);
        expect(obj[items[2].id].entry).toEqual(items[2]);
    });

    it('should serialize cache to JSON string', () => {
        expect.assertions(1);
        const k = items[0].id;
        cache.add(k, items[0]);
        const str = cache.toJSON();
        const obj = JSON.parse(str);
        expect(obj[k].entry).toEqual(items[0]);
    });

    it('should not grow the cache beyond its limit', () => {
        expect.assertions(7);
        const cacheWithLimit = new CacheFactory<string, Item>(200, 2);

        cacheWithLimit.add(items[0].id, items[0]);
        cacheWithLimit.add(items[1].id, items[1]);
        expect(cacheWithLimit.size()).toEqual(2);
        expect(cacheWithLimit.has(items[0].id)).toBe(true);
        expect(cacheWithLimit.has(items[1].id)).toBe(true);

        cacheWithLimit.add(items[2].id, items[2]);
        expect(cacheWithLimit.size()).toEqual(2);
        expect(cacheWithLimit.has(items[0].id)).toBe(false);
        expect(cacheWithLimit.has(items[1].id)).toBe(true);
        expect(cacheWithLimit.has(items[2].id)).toBe(true);
    });
});
