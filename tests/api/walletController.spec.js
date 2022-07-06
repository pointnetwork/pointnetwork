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

    it('Eth Address', async () => {
        expect.assertions(2);

        const res = await apiServer.inject({
            method: 'GET',
            url: 'https://pk.point/v1/api/wallet/address',
            headers: {host: 'pk.point'}
        });

        expect(res.statusCode).toEqual(200);
        expect(JSON.parse(res.payload)).toEqual({
            status: 200,
            data: {address: expect.stringMatching(/^0x/)},
            headers: {}
        });
    });

    it('Sol Address', async () => {
        expect.assertions(2);

        const res = await apiServer.inject({
            method: 'GET',
            url: 'https://pk.point/v1/api/wallet/address?network=solana_devnet',
            headers: {host: 'pk.point'}
        });

        expect(res.statusCode).toEqual(200);
        expect(JSON.parse(res.payload)).toEqual({
            status: 200,
            data: {address: expect.stringMatching(/^[a-zA-Z\d]{44}$/)},
            headers: {}
        });
    });

});
