import apiServer from '../../src/api/server';
// TODO: replace with import once we refactor it in src
const ethereum = require('../../src/network/providers/ethereum');

jest.mock('../../src/network/providers/ethereum', () => ({
    isCurrentIdentityRegistered: jest.fn(async () => true),
    ownerByIdentity: jest.fn(async (identity) => {
        if (identity === 'some_identity') {
            return '0xF6690149C78D0254EF65FDAA6B23EC6A342f6d8D';
        }
        return '0x0000000000000000000000000000000000000000';
    }),
    identityByOwner: jest.fn(async () => 'some_identity'),
    commPublicKeyByIdentity: jest.fn(async () => '0x5372118ab8a429b6a92e6ec3c0d2239c3910e64d3a55563b39cac350acf05b3a1d9b59102a54d9198af806b378dcd94e11f00f36b2fcfd523ecd4eb3224e5738'),
    getBlockTimestamp: jest.fn(async () => 1466691328)
}));

describe('Identity controller', () => {
    it('Is identity registered', async () => {
        expect.assertions(3);

        const res = await apiServer.inject({
            method: 'GET',
            url: 'https://is_identity_registered.point/v1/api/identity/isIdentityRegistered/',
            headers: {host: 'is_identity_registered.point'}
        });

        expect(res.statusCode).toEqual(200);
        expect(res.payload).toEqual(JSON.stringify({
            status: 200,
            data: {identityRegistred: true},
            headers: {}
        }));
        expect(ethereum.isCurrentIdentityRegistered).toHaveBeenCalledWith();
    });

    it('Identity to owner', async () => {
        expect.assertions(3);

        const res = await apiServer.inject({
            method: 'GET',
            url: 'https://identity_to_owner.point/v1/api/identity/identityToOwner/some_identity',
            headers: {host: 'identity_to_owner.point'}
        });

        expect(res.statusCode).toEqual(200);
        expect(res.payload).toEqual(JSON.stringify({
            status: 200,
            data: {owner: '0xF6690149C78D0254EF65FDAA6B23EC6A342f6d8D'},
            headers: {}
        }));
        expect(ethereum.ownerByIdentity).toHaveBeenCalledWith('some_identity');
    });

    it('Owner to identity', async () => {
        expect.assertions(3);

        const res = await apiServer.inject({
            method: 'GET',
            url: 'https://owner_to_identity.point/v1/api/identity/ownerToIdentity/0xF6690149C78D0254EF65FDAA6B23EC6A342f6d8D',
            headers: {host: 'owner_to_identity.point'}
        });

        expect(res.statusCode).toEqual(200);
        expect(res.payload).toEqual(JSON.stringify({
            status: 200,
            data: {identity: 'some_identity'},
            headers: {}
        }));
        expect(ethereum.identityByOwner).toHaveBeenCalledWith('0xF6690149C78D0254EF65FDAA6B23EC6A342f6d8D');
    });

    it('Public key by identity', async () => {
        expect.assertions(3);

        const res = await apiServer.inject({
            method: 'GET',
            url: 'https://pk_by_identity.point/v1/api/identity/publicKeyByIdentity/public_key_identity',
            headers: {host: 'pk_by_identity.point'}
        });

        expect(res.statusCode).toEqual(200);
        expect(res.payload).toEqual(JSON.stringify({
            status: 200,
            data: {publicKey: '0x5372118ab8a429b6a92e6ec3c0d2239c3910e64d3a55563b39cac350acf05b3a1d9b59102a54d9198af806b378dcd94e11f00f36b2fcfd523ecd4eb3224e5738'},
            headers: {}
        }));
        expect(ethereum.commPublicKeyByIdentity).toHaveBeenCalledWith('public_key_identity');
    });

    it('Block timestamp', async () => {
        expect.assertions(3);

        const res = await apiServer.inject({
            method: 'POST',
            url: 'https://block_timestamp.point/v1/api/identity/blockTimestamp',
            body: JSON.stringify({blockNumber: 1757201}),
            headers: {
                'host': 'block_timestamp.point',
                'Content-Type': 'application/json'
            }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.payload).toEqual(JSON.stringify({
            status: 200,
            data: {timestamp: 1466691328},
            headers: {}
        }));
        expect(ethereum.getBlockTimestamp).toHaveBeenCalledWith(1757201);
    });

    // TODO: openLink seems to be duplicated in web2 controller, should it be removed?

    it('Is identity eligible: tweet', async () => {
        expect.assertions(3);

        const res = await apiServer.inject({
            method: 'GET',
            url: 'https://is_identity_eligible.point/v1/api/identity/isIdentityEligible/tweet1',
            headers: {host: 'is_identity_eligible.point'}
        });

        expect(res.statusCode).toEqual(200);
        expect(JSON.parse(res.payload)).toEqual({
            status: 200,
            data: {
                eligibility: 'tweet',
                code: expect.any(String)
            },
            headers: {}
        });
        expect(ethereum.ownerByIdentity).toHaveBeenCalledWith('tweet1');
    });

    it('Is identity eligible: already registered', async () => {
        expect.assertions(3);

        const res = await apiServer.inject({
            method: 'GET',
            url: 'https://is_identity_eligible.point/v1/api/identity/isIdentityEligible/some_identity',
            headers: {host: 'is_identity_eligible.point'}
        });

        expect(res.statusCode).toEqual(200);
        expect(res.payload).toEqual(JSON.stringify({
            status: 200,
            data: {eligibility: 'unavailable', reason: 'Identity is already registered on web3'},
            headers: {}
        }));
        expect(ethereum.ownerByIdentity).toHaveBeenCalledWith('some_identity');
    });

    it('Is identity eligible: taken', async () => {
        expect.assertions(3);

        const res = await apiServer.inject({
            method: 'GET',
            url: 'https://is_identity_eligible.point/v1/api/identity/isIdentityEligible/taken1',
            headers: {host: 'is_identity_eligible.point'}
        });

        expect(res.statusCode).toEqual(200);
        expect(res.payload).toEqual(JSON.stringify({
            status: 200,
            data: {eligibility: 'taken', reason: 'taken reason'},
            headers: {}
        }));
        expect(ethereum.ownerByIdentity).toHaveBeenCalledWith('taken1');
    });

    it('Is identity eligible: unavailable', async () => {
        expect.assertions(3);

        const res = await apiServer.inject({
            method: 'GET',
            url: 'https://is_identity_eligible.point/v1/api/identity/isIdentityEligible/unavailable1',
            headers: {host: 'is_identity_eligible.point'}
        });

        expect(res.statusCode).toEqual(200);
        expect(res.payload).toEqual(JSON.stringify({
            status: 200,
            data: {eligibility: 'unavailable', reason: 'unavailable reason'},
            headers: {}
        }));
        expect(ethereum.ownerByIdentity).toHaveBeenCalledWith('unavailable1');
    });

    // TODO: register identity
    // TODO: resolve domain
});
