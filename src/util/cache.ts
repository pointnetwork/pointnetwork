import NodeCache from 'node-cache';

const defaultOptions = {
    ttl: 20, //20s
    checkInterval: 2, //2s
    useClones: false
};

export function createCache({ttl, checkInterval, useClones} = defaultOptions) {
    const cache = new NodeCache({stdTTL: ttl, checkperiod: checkInterval, useClones});
    return {
        async get<T=unknown>(key: string, storeFunction: () => Promise<T>) {
            const value = cache.get(key);
            if (value) {
                return value;
            }
            const calculatedValue = storeFunction();
            cache.set(key, calculatedValue);
            return calculatedValue;
        },
        delStartWith(startStr = '') {
            if (!startStr) {
                return;
            }
            const keys = cache.keys().filter((key) => key.includes(startStr));
            keys.forEach((key) => cache.del(key));
        },
        flush() {
            cache.flushAll();
        }
    };

}
