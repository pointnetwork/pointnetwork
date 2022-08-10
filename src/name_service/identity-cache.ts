import {IdentityData} from './types';

export class IdentityCache {
    private identities = new Map<string, {exp: number; entry: IdentityData}>();
    private ttlMs: number;

    constructor(ttlMs?: number) {
        this.ttlMs = ttlMs ?? 5 * 60 * 1000; // default: 5 minutes.
    }

    private checkExpired(k: string) {
        const id = this.identities.get(k);
        if (id?.exp && Date.now() > id.exp) {
            this.identities.delete(k);
        }
    }

    /**
     * Add entry to the cache.
     */
    public add(k: string, v: IdentityData) {
        this.identities.set(k, {
            exp: Date.now() + this.ttlMs,
            entry: v
        });
    }

    /**
     * Retrieve entry from the cache.
     * (returns `null` if not found)
     */
    public get(k: string): IdentityData | null {
        this.checkExpired(k);
        const item = this.identities.get(k);
        return item ? item.entry : null;
    }

    /**
     * Whether the given key is already in the cache.
     * (expired entries will be deleted and this method will return `false`)
     */
    public has(k: string) {
        this.checkExpired(k);
        return this.identities.has(k);
    }

    /**
     * Amount of entries.
     * (may include expired entries as they are removed lazily,
     * when trying to access them with `has` or `get`)
     */
    public size() {
        return this.identities.size;
    }

    /**
     * Remove all expired entries.
     */
    public clear() {
        this.identities.forEach((_, k) => this.checkExpired(k));
    }

    /**
     * Remove all entries.
     * (removes everything, expired and not expired)
     */
    public drop() {
        this.identities.clear();
    }

    /**
     * Convert to JSON string.
     */
    public toJSON() {
        return JSON.stringify(Object.fromEntries(this.identities));
    }
}

export const identityCache = new IdentityCache();
