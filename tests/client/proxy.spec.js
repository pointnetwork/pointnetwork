import attachHandlers from '../../src/client/proxy/handlers';

jest.mock('../../src/network/providers/ethereum', () => ({
    __esModule: true,
    default: {sendToContract: jest.fn(async () => 'OK')}
}));

import httpsServer from '../../src/client/proxy/httpsServer';
import ethereum from '../../src/network/providers/ethereum';

beforeAll(() => {
    attachHandlers(httpsServer, {});
});

describe('Proxy', () => {
    it('Contract send', async () => {
        expect.assertions(3);

        const res = await httpsServer.inject({
            method: 'POST',
            url: 'https://somedomain.point/_contract_send/ContractName.funcName(value1, value2)',
            payload: 'value1=foo&value2=bar',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        });

        expect(res.statusCode).toEqual(200);
        expect(res.statusMessage).toEqual('OK');
        expect(ethereum.sendToContract).toHaveBeenCalledWith(
            'somedomain:443',
            'ContractName',
            'funcName',
            ['foo', 'bar']
        );
    });
});
