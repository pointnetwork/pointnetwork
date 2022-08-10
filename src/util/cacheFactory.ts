/**
 * Factory to create caches with an expiration time.
 *
 * Optionally, it can have a limit of entries; when the limit is reached,
 * to add a new entry the oldest one is removed. If no limit is provided,
 * the cache can grow indefinitely.
 */
export class CacheFactory<K, V> {
    private ttlMs: number;
    private cache = new Map<K, {exp: number; entry: V}>();
    private limit: number;

    /**
     * `ttlMs` represents the time to live in milliseconds for each entry.
     * `limit` represents the max amount of entries that will be kept in the cache.
     */
    constructor(ttlMs: number, limit?: number) {
        this.ttlMs = ttlMs;
        this.limit = limit || Infinity; // defaults to having no limit.
    }

    private checkExpired(k: K) {
        const id = this.cache.get(k);
        if (id?.exp && Date.now() > id.exp) {
            this.cache.delete(k);
        }
    }

    private dropFirst() {
        for (const [k] of this.cache) {
            this.cache.delete(k);
            break;
        }
    }

    /**
     * Add entry to the cache.
     */
    public add(k: K, v: V) {
        if (this.cache.size === this.limit) {
            this.dropFirst();
        }

        this.cache.set(k, {
            exp: Date.now() + this.ttlMs,
            entry: v
        });
    }

    /**
     * Retrieve entry from the cache.
     * (returns `null` if not found)
     */
    public get(k: K): V | null {
        this.checkExpired(k);
        const item = this.cache.get(k);
        return item ? item.entry : null;
    }

    /**
     * Whether the given key is already in the cache.
     * (expired entries will be deleted and this method will return `false`)
     */
    public has(k: K) {
        this.checkExpired(k);
        return this.cache.has(k);
    }

    /**
     * Remove entry from cache.
     */
    public rm(k: K) {
        return this.cache.delete(k);
    }

    /**
     * Amount of entries.
     * (may include expired entries as they are removed lazily,
     * when trying to access them with `has` or `get`)
     */
    public size() {
        return this.cache.size;
    }

    /**
     * Remove all expired entries.
     */
    public clear() {
        this.cache.forEach((_, k) => this.checkExpired(k));
    }

    /**
     * Remove all entries.
     * (removes everything, expired and not expired)
     */
    public drop() {
        this.cache.clear();
    }

    /**
     * Convert to Object.
     */
    public toObj() {
        return Object.fromEntries(this.cache);
    }

    /**
     * Convert to JSON string.
     */
    public toJSON() {
        return JSON.stringify(Object.fromEntries(this.cache));
    }
}
