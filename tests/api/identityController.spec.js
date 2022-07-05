import apiServer from '../../src/api/server';
// TODO: replace with import once we refactor it in src
const ethereum = require('../../src/network/providers/ethereum');
const solana = require('../../src/network/providers/solana');

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
    getBlockTimestamp: jest.fn(async () => 1466691328),
    registerVerified: jest.fn(async () => {}),
    resolveDomain: jest.fn(async () => ({
        owner: '0xF6690149C78D0254EF65FDAA6B23EC6A342f6d8D',
        content: 'some_content'
    }))
}));

jest.mock('../../src/network/providers/solana', () => ({
    resolveDomain: jest.fn(async () => ({
        owner: 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg',
        content: 'some_content'
    }))
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

    it('Register: should return 403 if host is not point', async () => {
        expect.assertions(1);

        const res = await apiServer.inject({
            method: 'POST',
            url: 'https://register.point/v1/api/identity/register',
            body: JSON.stringify({identity: 'free_identity'}),
            headers: {
                'host': 'register.point',
                'Content-Type': 'application/json'
            }
        });

        expect(res.statusCode).toEqual(403);
    });

    // TODO: csrf might be broken

    it('Should register free identity', async () => {
        expect.assertions(3);

        const res = await apiServer.inject({
            method: 'POST',
            url: 'https://point/v1/api/identity/register',
            body: JSON.stringify({identity: 'free_identity'}),
            headers: {
                'host': 'point',
                'Content-Type': 'application/json'
            }
        });

        expect(res.statusCode).toEqual(200);
        expect(ethereum.registerVerified).toHaveBeenCalledWith(
            'free_identity',
            expect.any(String),
            expect.any(Buffer),
            expect.any(String),
            {v: 'v', r: 'r', s: 's'}
        );
        expect(res.payload).toEqual(JSON.stringify({
            status: 200,
            data: {success: true},
            headers: {}
        }));
    });

    it('Should return code for registering tweet-eligible identity', async () => {
        expect.assertions(2);

        const res = await apiServer.inject({
            method: 'POST',
            url: 'https://point/v1/api/identity/register',
            body: JSON.stringify({identity: 'tweet_identity'}),
            headers: {
                'host': 'point',
                'Content-Type': 'application/json'
            }
        });

        expect(res.statusCode).toEqual(200);
        expect(JSON.parse(res.payload)).toEqual({
            status: 200,
            data: {code: expect.any(String)},
            headers: {}
        });
    });

    it('Should return false for registering taken identity', async () => {
        expect.assertions(2);

        const res = await apiServer.inject({
            method: 'POST',
            url: 'https://point/v1/api/identity/register',
            body: JSON.stringify({identity: 'taken_identity'}),
            headers: {
                'host': 'point',
                'Content-Type': 'application/json'
            }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.payload).toEqual(JSON.stringify({
            status: 200,
            data: {eligibility: 'taken', reason: 'taken reason'},
            headers: {}
        }));
    });

    it('Should return false for registering unavailable identity', async () => {
        expect.assertions(2);

        const res = await apiServer.inject({
            method: 'POST',
            url: 'https://point/v1/api/identity/register',
            body: JSON.stringify({identity: 'unavailable_identity'}),
            headers: {
                'host': 'point',
                'Content-Type': 'application/json'
            }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.payload).toEqual(JSON.stringify({
            status: 200,
            data: {eligibility: 'unavailable', reason: 'unavailable reason'},
            headers: {}
        }));
    });

    it('Should register identity with tweet verification', async () => {
        expect.assertions(3);

        const res = await apiServer.inject({
            method: 'POST',
            url: 'https://point/v1/api/identity/register',
            body: JSON.stringify({
                identity: 'verified_identity',
                address: '0xF6690149C78D0254EF65FDAA6B23EC6A342f6d8D',
                url: 'https://anything.com'
            }),
            headers: {
                'host': 'point',
                'Content-Type': 'application/json'
            }
        });

        expect(res.statusCode).toEqual(200);
        expect(ethereum.registerVerified).toHaveBeenCalledWith(
            'verified_identity',
            expect.any(String),
            expect.any(Buffer),
            expect.any(String),
            {v: 'v', r: 'r', s: 's'}
        );
        expect(res.payload).toEqual(JSON.stringify({
            status: 200,
            data: {success: true},
            headers: {}
        }));
    });

    it('Resolve domain: should return 400 for unknown domain type', async () => {
        expect.assertions(2);

        const res = await apiServer.inject({
            method: 'GET',
            url: 'https://resolve.point/v1/api/identity/resolve/example.foo',
            headers: {host: 'resolve.point'}
        });

        expect(res.statusCode).toEqual(400);
        expect(res.payload).toEqual(JSON.stringify({
            status: 400,
            data: {errorMsg: `Unsupported TLD in "example.foo".`},
            headers: {}
        }));
    });

    it('Resolve domain: should resolve eth domain', async () => {
        expect.assertions(3);

        const res = await apiServer.inject({
            method: 'GET',
            url: 'https://resolve.point/v1/api/identity/resolve/example.eth',
            headers: {host: 'resolve.point'}
        });

        expect(res.statusCode).toEqual(200);
        expect(res.payload).toEqual(JSON.stringify({
            status: 200,
            data: {
                owner: '0xF6690149C78D0254EF65FDAA6B23EC6A342f6d8D',
                content: 'some_content'
            },
            headers: {}
        }));
        expect(ethereum.resolveDomain).toHaveBeenCalledWith('example.eth');
    });

    it('Resolve domain: should resolve sol domain', async () => {
        expect.assertions(3);

        const res = await apiServer.inject({
            method: 'GET',
            url: 'https://resolve.point/v1/api/identity/resolve/example.sol',
            headers: {host: 'resolve.point'}
        });

        expect(res.statusCode).toEqual(200);
        expect(res.payload).toEqual(JSON.stringify({
            status: 200,
            data: {
                owner: 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg',
                content: 'some_content'
            },
            headers: {}
        }));
        expect(solana.resolveDomain).toHaveBeenCalledWith('example.sol');
    });
});
