import apiServer from '../../src/api/server';
import handleRPC from '../../src/rpc/rpc-handlers';
import config from 'config';

jest.mock('../../src/rpc/rpc-handlers', () => ({
    __esModule: true,
    default: jest.fn(async () => ({
        status: 200,
        result: 'mock_rpc_res'
    }))
}));

describe('API blockchain controller', () => {

    it('RPC Request', async () => {
        expect.assertions(3);

        const call = {
            id: new Date().getTime(),
            method: 'eth_call',
            params: [{
                from: '0xF6690149C78D0254EF65FDAA6B23EC6A342f6d8D',
                to: '0xa2694005d321212F340c8422FAAcd1dfa5450A56',
                data: '0x'
            }],
            network: 'xnet'
        };

        const res = await apiServer.inject({
            method: 'POST',
            url: 'https://blockchain_test_domain.point/v1/api/blockchain',
            payload: JSON.stringify(call),
            headers: {
                'Content-Type': 'application/json',
                'host': 'blockchain_test_domain.point',
                'origin': 'https://blockchain_test_domain.point'
            }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.payload).toEqual('mock_rpc_res');
        expect(handleRPC).toHaveBeenCalledWith({
            ...call,
            origin: 'https://blockchain_test_domain.point'
        });
    });
});
