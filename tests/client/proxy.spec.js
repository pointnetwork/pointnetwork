import attachHandlers from '../../src/client/proxy/handlers';
import httpsServer from '../../src/client/proxy/httpsServer';
import ethereum from '../../src/network/providers/ethereum';

jest.mock('../../src/network/providers/ethereum', () => ({
    __esModule: true,
    default: {
        sendToContract: jest.fn(async () => 'test_send_to_contract_reply'),
        getKeyValue: jest.fn(async (identity, key) => {
            // If we return something unconditionally, we'll run into infinite loop
            // when calling keyValue.list in keyvalue_append
            if (key.endsWith('0')) {
                return 'test_value';
            }
            return null;
        }),
        putKeyValue: jest.fn(async () => {}),
        getKeyLastVersion: jest.fn(async () => '1.0')
    }
}));

beforeAll(() => {
    attachHandlers(httpsServer, {});
});

describe('Proxy', () => {
    it('Should perform contract_send request', async () => {
        expect.assertions(3);

        const res = await httpsServer.inject({
            method: 'POST',
            url: 'https://contract_send_domain.point/_contract_send/ContractName.funcName(value1, value2)',
            payload: 'value1=foo&value2=bar',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'host': 'contract_send_domain.point'
            }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.payload).toEqual('test_send_to_contract_reply');
        expect(ethereum.sendToContract).toHaveBeenCalledWith(
            'contract_send_domain',
            'ContractName',
            'funcName',
            ['foo', 'bar']
        );
    });

    it('Should load explorer index page', async () => {
        expect.assertions(3);

        const res = await httpsServer.inject({
            method: 'GET',
            url: 'https://point',
            headers: {host: 'point'}
        });

        expect(res.statusCode).toEqual(200);
        expect(res.payload).toMatch(/^<!DOCTYPE html>/);
        expect(res.payload).toMatch('<title>Point Explorer</title>');
    });

    it('Should perform keyvalue_get request', async () => {
        expect.assertions(3);

        const res = await httpsServer.inject({
            method: 'GET',
            url: 'https://keyvalue_get_domain.point/_keyvalue_get/test_key0',
            headers: {host: 'keyvalue_get_domain.point'}
        });

        expect(res.statusCode).toEqual(200);
        expect(res.payload).toEqual('test_value');
        expect(ethereum.getKeyValue).toHaveBeenCalledWith('keyvalue_get_domain', 'test_key0');
    });

    it('Should perform keyvalue_append request', async () => {
        expect.assertions(3);

        const res = await httpsServer.inject({
            method: 'POST',
            url: 'https://keyvalue_append_domain.point/_keyvalue_append/test_key',
            payload: 'value1=foo&value2=bar',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'host': 'keyvalue_append_domain.point'
            }
        });

        expect(res.statusCode).toEqual(200);
        expect(ethereum.getKeyLastVersion).toHaveBeenCalledWith('keyvalue_append_domain', '::rootDir');
        expect(ethereum.putKeyValue).toHaveBeenCalledWith(
            'keyvalue_append_domain',
            // Our mocked getKeyValue will return value for test_key0, so test_key1 should be
            // the one to be appended
            'test_key1',
            expect.stringMatching(/^\{"value1":"foo","value2":"bar",/),
            '1.0'
        );
    });
});
