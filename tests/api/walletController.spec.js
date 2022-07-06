import apiServer from '../../src/api/server';
import ethereum from '../../src/network/providers/ethereum';
import solana from '../../src/network/providers/solana';

jest.mock('../../src/network/providers/ethereum', () => ({getBalance: jest.fn(async () => 1000000000000)}));

jest.mock('../../src/network/providers/solana', () => ({getBalance: jest.fn(async () => 1000000000)}));

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
            url: 'https://address.point/v1/api/wallet/address',
            headers: {host: 'address.point'}
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
            url: 'https://address.point/v1/api/wallet/address?network=solana_devnet',
            headers: {host: 'address.point'}
        });

        expect(res.statusCode).toEqual(200);
        expect(JSON.parse(res.payload)).toEqual({
            status: 200,
            data: {address: expect.stringMatching(/^[a-zA-Z\d]{44}$/)},
            headers: {}
        });
    });

    it('Eth Balance', async () => {
        expect.assertions(3);

        const res = await apiServer.inject({
            method: 'GET',
            url: 'https://balance.point/v1/api/wallet/balance',
            headers: {host: 'balance.point'}
        });

        expect(res.statusCode).toEqual(200);
        expect(ethereum.getBalance).toHaveBeenCalledWith({
            address: expect.stringMatching(/^0x/),
            network: 'ynet'
        });
        expect(JSON.parse(res.payload)).toEqual({
            status: 200,
            data: {balance: 1000000000000},
            headers: {}
        });
    });

    it('Sol Balance', async () => {
        expect.assertions(3);

        const res = await apiServer.inject({
            method: 'GET',
            url: 'https://balance.point/v1/api/wallet/balance?network=solana_devnet',
            headers: {host: 'balance.point'}
        });

        expect(res.statusCode).toEqual(200);
        expect(solana.getBalance).toHaveBeenCalledWith('solana_devnet');
        expect(JSON.parse(res.payload)).toEqual({
            status: 200,
            data: {balance: 1000000000},
            headers: {}
        });
    });
});
