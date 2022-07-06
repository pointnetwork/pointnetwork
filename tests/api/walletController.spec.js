import apiServer from '../../src/api/server';

describe('Wallet controller', () => {
    it('Public key', async () => {
        expect.assertions(2);

        const res = await apiServer.inject({
            method: 'GET',
            url: 'https://pk.point/v1/api/wallet/publicKey',
            headers: {host: 'pk.point'}
        });

        expect(res.statusCode).toEqual(200);
        expect(JSON.parse(res.payload)).toEqual({
            status: 200,
            data: {publicKey: expect.any(String)},
            headers: {}
        });
    });
});
