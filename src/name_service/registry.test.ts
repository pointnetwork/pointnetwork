import {parseDomainRegistry} from './registry';
import {DomainRegistry, PointDomainData} from './types';

type TestCase = [DomainRegistry, PointDomainData];

const owner = 'blockchain_address-not_important_for_these_tests';

const testCases: TestCase[] = [
    [
        {owner, content: {decoded: 'ipfs=cid', error: null}},
        {identity: '', isAlias: false, rootDirId: '', routesId: ''}
    ],
    [
        {owner, content: {decoded: 'ipfs=cid;pn_alias=ynet_blog', error: null}},
        {identity: 'ynet_blog', isAlias: true}
    ],
    [
        {owner, content: {decoded: 'pn_alias=ynet_blog;arwv=chunkId', error: null}},
        {identity: 'ynet_blog', isAlias: true}
    ],
    [
        {
            owner,
            content: {
                decoded:
                    'email=a@b.c;pn_id=ynet_blog;pn_root=root-chunk-id;pn_routes=routes-chunk-id',
                error: null
            }
        },
        {
            identity: 'ynet_blog',
            isAlias: false,
            routesId: 'routes-chunk-id',
            rootDirId: 'root-chunk-id'
        }
    ],
    [
        {
            owner,
            content: {
                decoded:
                    'ipfs=QmPnNSjCPPNo4ckjaZ5BD82jSjxYJ7MBc5BVv2cWeYE6dn;pn_id=ynet_bareminimum;pn_routes=0x339b11f3cd1fc986d77356f2be50544a38b01fe64b744262e656813827e6555d;pn_root=d7817fbdda33796626b3f2cebe08b422168ac951378392d29ab239232a0cecdd',
                error: null
            }
        },
        {
            identity: 'ynet_bareminimum',
            isAlias: false,
            routesId: '0x339b11f3cd1fc986d77356f2be50544a38b01fe64b744262e656813827e6555d',
            rootDirId: 'd7817fbdda33796626b3f2cebe08b422168ac951378392d29ab239232a0cecdd'
        }
    ]
];

describe('name service > registry', () => {
    test.each(testCases)('parses a domain registry into Point domain data', (reg, expected) => {
        expect(parseDomainRegistry(reg)).toEqual(expected);
    });
});
