import {parseDomainRegistry} from './registry';
import {DomainRegistry, PointDomainData} from './types';

type TestCase = [DomainRegistry, PointDomainData];

const owner = 'blockchain_address-not_important_for_these_tests';

const testCases: TestCase[] = [
    [
        {owner, content: 'ipfs=cid'},
        {identity: '', isAlias: false, rootDirId: '', routesId: '', pointAddress: ''}
    ],
    [
        {owner, content: 'ipfs=cid;pn_alias=ynet_blog'},
        {identity: 'ynet_blog', isAlias: true, pointAddress: '', routesId: '', rootDirId: ''}
    ],
    [
        {owner, content: 'pn_alias=ynet_blog;arwv=chunkId'},
        {identity: 'ynet_blog', isAlias: true, pointAddress: '', routesId: '', rootDirId: ''}
    ],
    [
        {
            owner,
            content:
                'pn_alias=ynet_blog;arwv=chunkId;pn_addr=0xF5277b8B7a620f1E04a4a205A6e552D084BBf76B'
        },
        {
            identity: 'ynet_blog',
            isAlias: true,
            pointAddress: '0xF5277b8B7a620f1E04a4a205A6e552D084BBf76B',
            routesId: '',
            rootDirId: ''
        }
    ],
    [
        {
            owner,
            content: 'email=a@b.c;pn_root=root-chunk-id;pn_routes=routes-chunk-id'
        },
        {
            identity: '',
            isAlias: false,
            routesId: 'routes-chunk-id',
            rootDirId: 'root-chunk-id',
            pointAddress: ''
        }
    ],
    [
        {
            owner,
            content:
                'ipfs=QmPnNSjCPPNo4ckjaZ5BD82jSjxYJ7MBc5BVv2cWeYE6dn;pn_routes=0x339b11f3cd1fc986d77356f2be50544a38b01fe64b744262e656813827e6555d;pn_root=d7817fbdda33796626b3f2cebe08b422168ac951378392d29ab239232a0cecdd;pn_addr=0xF5277b8B7a620f1E04a4a205A6e552D084BBf76B'
        },
        {
            identity: '',
            isAlias: false,
            routesId: '0x339b11f3cd1fc986d77356f2be50544a38b01fe64b744262e656813827e6555d',
            rootDirId: 'd7817fbdda33796626b3f2cebe08b422168ac951378392d29ab239232a0cecdd',
            pointAddress: '0xF5277b8B7a620f1E04a4a205A6e552D084BBf76B'
        }
    ],
    [
        {
            owner,
            content:
                'pn_addr=0xF5277b8B7a620f1E04a4a205A6e552D084BBf76B;pn_root=root-id;pn_routes=routes-id'
        },
        {
            identity: '',
            isAlias: false,
            routesId: 'routes-id',
            rootDirId: 'root-id',
            pointAddress: '0xF5277b8B7a620f1E04a4a205A6e552D084BBf76B'
        }
    ]
];

describe('name service > registry', () => {
    test.each(testCases)('parses a domain registry into Point domain data', (reg, expected) => {
        expect(parseDomainRegistry(reg)).toEqual(expected);
    });
});
