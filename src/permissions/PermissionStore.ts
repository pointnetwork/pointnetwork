import crypto from 'crypto';
import {PermissionRecord} from './types';
import {Storer} from './Storer';
import MemoryStorer from './MemoryStorer';

class PermissionStore {
    private storer: Storer<PermissionRecord>;

    constructor(storer: Storer<PermissionRecord>) {
        this.storer = storer;
    }

    private getId(dappDomain: string, address: string): string {
        return crypto
            .createHash('md5')
            .update(dappDomain + address)
            .digest('hex');
    }

    /**
     * Insert or update record with new permissions for the current dApp and address.
     * If the record already exists, it is updated by appending
     * the new allowed methods to the previous ones.
     */
    async upsert(dappDomain: string, address: string, allowedMethods: string[]): Promise<string> {
        const id = this.getId(dappDomain, address);
        const existingRecord = await this.storer.find(id);

        const recordToUpsert = {
            id,
            invoker: dappDomain,
            account: address,
            parentCapabilities: allowedMethods
        };

        if (!existingRecord) {
            await this.storer.insert(recordToUpsert);
        } else {
            await this.storer.update(recordToUpsert);
        }

        return id;
    }

    /**
     * Fetch permissions that the dApp has for the current account.
     */
    async get(dappDomain: string, address: string): Promise<PermissionRecord | undefined> {
        const id = this.getId(dappDomain, address);
        const record = await this.storer.find(id);
        return record;
    }
}

const memoryStorer = new MemoryStorer();
const permissionStore = new PermissionStore(memoryStorer);

export default permissionStore;
