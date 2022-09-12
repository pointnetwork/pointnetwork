import {identityCache, addToCache} from './identity-cache';
import {IdentityData} from './types';

describe('addToCache', () => {
    const network = 'point';
    const address = '0xF5277b8B7a620f1E04a4a205A6e552D084BBf76B';
    const publicKey =
        '0xc264f479169ffec607a050dbeb6c894c0cfff4de632358d8e1850d99a290f785d129f4a5a71e8d4f767a753e8dccaaf17636755a6becd69c97baff8e978efb03';

    it('should overwrite identity not yet expired', () => {
        expect.assertions(4);
        const key = `point:${address}`;

        const unregistered: IdentityData = {
            identity: null,
            address,
            publicKey,
            network
        };
        identityCache.add(key, unregistered);
        expect(identityCache.size()).toEqual(1);
        expect(identityCache.get(key)?.identity).toBeNull();

        addToCache({address, identity: 'my_new_handle', publicKey, network});
        expect(identityCache.size()).toEqual(1);
        expect(identityCache.get(key)?.identity).toEqual('my_new_handle');
    });
});
