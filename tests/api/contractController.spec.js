import apiServer from '../../src/api/server';
// TODO: replace with import once we refactor it in src
const ethereum = require('../../src/network/providers/ethereum');

jest.mock('../../src/network/providers/ethereum', () => ({
    loadWebsiteContract: jest.fn(async () => ({
        _address: '0xF6690149C78D0254EF65FDAA6B23EC6A342f6d8D',
        _jsonInterface: [{
            constant: true,
            inputs: [],
            name: 'name',
            outputs: [
                {
                    name: '',
                    type: 'string'
                }
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function'
        }]
    }))
}));

// TODO: no auth check here?
describe('Contract controller', () => {
    it('load', async () => {
        expect.assertions(3);

        const res = await apiServer.inject({
            method: 'GET',
            url: 'https://contract_load_domain.point/v1/api/contract/load/ContractLoadName',
            headers: {host: 'contract_load_domain.point'}
        });

        expect(res.statusCode).toEqual(200);
        expect(res.payload).toEqual(JSON.stringify({
            status: 200,
            data: {
                address: '0xF6690149C78D0254EF65FDAA6B23EC6A342f6d8D',
                abi: [{
                    constant: true,
                    inputs: [],
                    name: 'name',
                    outputs: [
                        {
                            name: '',
                            type: 'string'
                        }
                    ],
                    payable: false,
                    stateMutability: 'view',
                    type: 'function'
                }]
            },
            headers: {} // TODO: why do we return headers in payload??
        }));
        expect(ethereum.loadWebsiteContract).toHaveBeenCalledWith(
            'contract_load_domain.point',
            'ContractLoadName'
        );
    });
});
