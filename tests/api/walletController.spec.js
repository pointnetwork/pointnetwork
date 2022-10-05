import config from 'config';
import apiServer from '../../src/api/server';
import ethereum from '../../src/network/providers/ethereum';
import solana from '../../src/network/providers/solana';
import httpsServer from '../../src/client/proxy/httpsServer';

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
            url: 'https://address.point/v1/api/wallet/address?network=mock_sol_net',
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
            network: config.get('network.default_network')
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
            url: 'https://balance.point/v1/api/wallet/balance?network=mock_sol_net',
            headers: {host: 'balance.point'}
        });

        expect(res.statusCode).toEqual(200);
        expect(solana.getBalance).toHaveBeenCalledWith('mock_sol_net');
        expect(JSON.parse(res.payload)).toEqual({
            status: 200,
            data: {balance: 1000000000},
            headers: {}
        });
    });

    it('Hash: should return 403 if host is not point', async () => {
        expect.assertions(1);

        const res = await httpsServer.inject({
            method: 'GET',
            url: 'https://balance.point/point_api/wallet/hash',
            headers: {host: 'balance.point'}
        });

        expect(res.statusCode).toEqual(403);
    });

    it('Hash', async () => {
        expect.assertions(1);

        const res = await httpsServer.inject({
            method: 'GET',
            url: 'https://confirmation-window/point_api/wallet/hash',
            headers: {host: 'confirmation-window'}
        });

        expect(JSON.parse(res.payload)).toEqual({
            status: 200,
            data: {hash: expect.stringMatching(/^0x/)},
            headers: {}
        });
    });
});
