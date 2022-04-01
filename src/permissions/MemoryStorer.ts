import {Storer} from './Storer';
import {PermissionRecord} from './types';

class MemoryStorer implements Storer<PermissionRecord> {
    private db: PermissionRecord[] = [];

    async find(id: string) {
        const record = this.db.find(r => r.id === id);
        return record;
    }

    async insert(record: PermissionRecord) {
        this.db.push(record);
        return record.id;
    }

    async update(record: PermissionRecord) {
        this.db = this.db.map(r => {
            if (r.id !== record.id) return r;
            return {
                ...r,
                parentCapabilities: Array.from(
                    new Set([...r.parentCapabilities, ...record.parentCapabilities])
                )
            };
        });
        return record.id;
    }

    async remove(id: string) {
        this.db = this.db.filter(r => r.id !== id);
        return id;
    }
}

export default MemoryStorer;
