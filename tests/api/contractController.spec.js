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
    // TODO: call gonna be deprecated, no tests for it

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

    // TODO: send gonna be deprecated, no tests for it

    // TODO: are events working?

    it('Encode function call', async () => {
        expect.assertions(2);
        
        const res = await apiServer.inject({
            method: 'POST',
            url: 'https://encode_call_domain.point/v1/api/contract/encodeFunctionCall',
            body: JSON.stringify({
                jsonInterface: {
                    inputs: [{internalType:'address', name:'id_', type:'address'}],
                    name:'getProfile',
                    outputs: [{
                        components: [
                            {internalType:'bytes32', name:'displayName', type:'bytes32'},
                            {internalType:'bytes32', name:'displayLocation', type:'bytes32'},
                            {internalType:'bytes32', name:'displayAbout', type:'bytes32'},
                            {internalType:'bytes32', name:'avatar', type:'bytes32'},
                            {internalType:'bytes32', name:'banner', type:'bytes32'}
                        ],
                        internalType:'struct PointSocial.Profile',
                        name:'',
                        type:'tuple'
                    }],
                    stateMutability:'view',
                    type:'function',
                    constant:true,
                    signature:'0x0f53a470'
                },
                params: ['0x556289d47eCC8A1bb0acEF71A24474df5700BD42']
            }),
            headers: {
                'host': 'encode_call_domain.point',
                'Content-Type': 'application/json'
            }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.payload).toEqual(JSON.stringify({
            status: 200,
            data: '0x0f53a470000000000000000000000000556289d47ecc8a1bb0acef71a24474df5700bd42',
            headers: {}
        }));
    });

    it('Encode function call', async () => {
        expect.assertions(2);

        const res = await apiServer.inject({
            method: 'POST',
            url: 'https://decode_params_domain.point/v1/api/contract/decodeParameters',
            body: JSON.stringify({
                typesArray:[
                    {
                        components: [
                            {internalType:'uint256', name:'id', type:'uint256'},
                            {internalType:'address', name:'from', type:'address'},
                            {internalType:'bytes32', name:'contents', type:'bytes32'},
                            {internalType:'bytes32', name:'image', type:'bytes32'},
                            {internalType:'uint256', name:'createdAt', type:'uint256'},
                            {internalType:'uint16', name:'likesCount', type:'uint16'},
                            {internalType:'uint16', name:'commentsCount', type:'uint16'}
                        ],
                        internalType:'struct PointSocial.Post[]',
                        name:'',
                        type:'tuple[]'
                    }
                ],
                hexString:'0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000050000000000000000000000000000000000000000000000000000000000000029000000000000000000000000644419506f3b90db4c7600c5f62fc3218ab62dcc6c0abfb78f893ca254dbca7cb9498367f4057b39b8206f022d6dec4679833b0c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000062ad286d00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a0000000000000000000000008cf76f1d6e54a44961bcbca13d359e3b93415598235755130eb506c99ac770eec55abb52e59aafa09491943f417a37fa656171ed00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000062b5b3e900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002b000000000000000000000000556289d47ecc8a1bb0acef71a24474df5700bd426d4ae945268f36c9c4fbf4a06fb465119cb30e39ee8da2eb55ac2a9e67a799ba711da6c65407f28bad6b8b3e21e9d1b7816e4889d3a5f281ba5e97bb3a2b5b9e0000000000000000000000000000000000000000000000000000000062b89c2f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000a2694005d321212f340c8422faacd1dfa5450a569c22ff5f21f0b81b113e63f7db6da94fedef11b2119b4088b89664fb9a3cb65800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000062bb944500000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002d000000000000000000000000a2694005d321212f340c8422faacd1dfa5450a566da11b4d664b2dd19b063bea72ae420e0a9e424050b3546095d25bf1f5b6e42cdebb112f5690afe65c1eb45c5d4f10e4fded21d0d6a8d700a48bf0bdfb882fe20000000000000000000000000000000000000000000000000000000062bc974900000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003'
            }),
            headers: {
                'host': 'decode_params_domain.point',
                'Content-Type': 'application/json'
            }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.payload).toEqual(JSON.stringify({
            status: 200,
            data: {
                0: [
                    [
                        '41',
                        '0x644419506f3b90Db4C7600C5f62FC3218aB62DCC',
                        '0x6c0abfb78f893ca254dbca7cb9498367f4057b39b8206f022d6dec4679833b0c',
                        '0x0000000000000000000000000000000000000000000000000000000000000000',
                        '1655515245',
                        '1',
                        '0'
                    ],
                    [
                        '42',
                        '0x8Cf76F1D6E54A44961BCBcA13d359E3B93415598',
                        '0x235755130eb506c99ac770eec55abb52e59aafa09491943f417a37fa656171ed',
                        '0x0000000000000000000000000000000000000000000000000000000000000000',
                        '1656075241',
                        '0',
                        '0'
                    ],
                    [
                        '43',
                        '0x556289d47eCC8A1bb0acEF71A24474df5700BD42',
                        '0x6d4ae945268f36c9c4fbf4a06fb465119cb30e39ee8da2eb55ac2a9e67a799ba',
                        '0x711da6c65407f28bad6b8b3e21e9d1b7816e4889d3a5f281ba5e97bb3a2b5b9e',
                        '1656265775',
                        '0',
                        '0'
                    ],
                    [
                        '44',
                        '0xa2694005d321212F340c8422FAAcd1dfa5450A56',
                        '0x9c22ff5f21f0b81b113e63f7db6da94fedef11b2119b4088b89664fb9a3cb658',
                        '0x0000000000000000000000000000000000000000000000000000000000000000',
                        '1656460357',
                        '2',
                        '0'
                    ],
                    [
                        '45',
                        '0xa2694005d321212F340c8422FAAcd1dfa5450A56',
                        '0x6da11b4d664b2dd19b063bea72ae420e0a9e424050b3546095d25bf1f5b6e42c',
                        '0xdebb112f5690afe65c1eb45c5d4f10e4fded21d0d6a8d700a48bf0bdfb882fe2',
                        '1656526665',
                        '1',
                        '3'
                    ]
                ],
                __length__:1
            },
            headers: {}
        }));
    });
});
