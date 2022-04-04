import {PermissionStore} from './PermissionStore';
import MemoryStorer from './MemoryStorer';

const memoryStorer = new MemoryStorer();
const permissionStore = new PermissionStore(memoryStorer);

describe('PermissionStore', () => {
    const dappDomain = 'https://mydapp.point';
    const address = '0x916f8e7566dd63d7c444468cadea37e80f7f8048';

    it('should return no permissions', async () => {
        const retrieved = await permissionStore.get(dappDomain, address);
        expect(retrieved).toBeUndefined();
    });

    it('should create a new permissions record and retrieve it', async () => {
        const methods = ['eth_getBalance'];
        const id = await permissionStore.upsert(dappDomain, address, methods);
        expect(typeof id).toBe('string');
        const retrieved = await permissionStore.get(dappDomain, address);
        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toEqual(id);
        expect(retrieved?.parentCapabilities).toEqual(methods);
    });

    it('should append new method to existing permission record', async () => {
        const newMethod = 'eth_sendTransaction';
        await permissionStore.upsert(dappDomain, address, [newMethod]);
        const retrieved = await permissionStore.get(dappDomain, address);
        expect(retrieved).toBeDefined();
        expect(retrieved?.parentCapabilities).toEqual(['eth_getBalance', newMethod]);
    });

    it('should retrieve permission record for the right dapp domain and user address', async () => {
        const retrieved = await permissionStore.get(dappDomain, address);
        expect(retrieved).toBeDefined();
        expect(retrieved?.invoker).toEqual(dappDomain);
        expect(retrieved?.account).toEqual(address);
    });

    it('should not retrieve permission record for wrong dapp domain', async () => {
        const retrieved = await permissionStore.get('not-a-real-domain', address);
        expect(retrieved).toBeUndefined();
    });

    it('should not retrieve permission record for wrong address', async () => {
        const retrieved = await permissionStore.get(dappDomain, 'not-the-user-address');
        expect(retrieved).toBeUndefined();
    });

    it('should revoke all permissions', async () => {
        await permissionStore.revoke(dappDomain, address);
        const retrieved = await permissionStore.get(dappDomain, address);
        expect(retrieved).toBeUndefined();
    });
});
