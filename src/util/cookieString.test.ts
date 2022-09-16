import {parseCookieString, encodeCookieString, merge} from './cookieString';

type ParseTestCase = [string, Record<string, string>];

const parseTestCases: ParseTestCase[] = [
    ['key=value', {key: 'value'}],
    ['a=b;c=d;e=f;', {a: 'b', c: 'd', e: 'f'}],
    ['ipfs=some-cid;pn_alias=ynet_blog', {ipfs: 'some-cid', pn_alias: 'ynet_blog'}],
    [';key=value', {key: 'value'}],
    ['key=value;', {key: 'value'}],
    ['', {}],
    ['a;c=d;e=f;', {c: 'd', e: 'f'}],
    ['my-key=value', {'my-key': 'value'}],
    ['in;valid', {}],
    ['no_equals_sign', {}],
    [
        'ipfs=QmPnNSjCPPNo4ckjaZ5BD82jSjxYJ7MBc5BVv2cWeYE6dn;pn_routes=0x339b11f3cd1fc986d77356f2be50544a38b01fe64b744262e656813827e6555d;pn_root=d7817fbdda33796626b3f2cebe08b422168ac951378392d29ab239232a0cecdd',
        {
            ipfs: 'QmPnNSjCPPNo4ckjaZ5BD82jSjxYJ7MBc5BVv2cWeYE6dn',
            pn_routes: '0x339b11f3cd1fc986d77356f2be50544a38b01fe64b744262e656813827e6555d',
            pn_root: 'd7817fbdda33796626b3f2cebe08b422168ac951378392d29ab239232a0cecdd'
        }
    ]
];

describe('parseCookieString', () => {
    test.each(parseTestCases)('parses %s into an object', (str, expected) => {
        expect(parseCookieString(str)).toEqual(expected);
    });
});

type EncodeTestCase = [Record<string, string>, string];

const encodeTestCases: EncodeTestCase[] = [
    [{key: 'value'}, 'key=value'],
    [{a: 'b', c: 'd', e: 'f'}, 'a=b;c=d;e=f'],
    [{ipfs: 'some-cid', pn_alias: 'ynet_blog'}, 'ipfs=some-cid;pn_alias=ynet_blog'],
    [{}, ''],
    [{'my-key': 'value'}, 'my-key=value'],
    [
        {
            ipfs: 'QmPnNSjCPPNo4ckjaZ5BD82jSjxYJ7MBc5BVv2cWeYE6dn',
            pn_routes: '0x339b11f3cd1fc986d77356f2be50544a38b01fe64b744262e656813827e6555d',
            pn_root: 'd7817fbdda33796626b3f2cebe08b422168ac951378392d29ab239232a0cecdd'
        },
        'ipfs=QmPnNSjCPPNo4ckjaZ5BD82jSjxYJ7MBc5BVv2cWeYE6dn;pn_routes=0x339b11f3cd1fc986d77356f2be50544a38b01fe64b744262e656813827e6555d;pn_root=d7817fbdda33796626b3f2cebe08b422168ac951378392d29ab239232a0cecdd'
    ]
];

describe('encodeCookieString', () => {
    test.each(encodeTestCases)('encodes %s into a cookie string', (obj, expected) => {
        expect(encodeCookieString(obj)).toEqual(expected);
    });
});

type MergeTestCase = [string, Record<string, string>, Record<string, string>];

const mergeTestCases: MergeTestCase[] = [
    [
        'ipfs=QmPnNSjCPPNo4ckjaZ5BD82jSjxYJ7MBc5BVv2cWeYE6dn',
        {pn_alias: 'ynet_me'},
        {ipfs: 'QmPnNSjCPPNo4ckjaZ5BD82jSjxYJ7MBc5BVv2cWeYE6dn', pn_alias: 'ynet_me'}
    ],
    ['pn_alias=old-idenitity', {pn_alias: 'new-identity'}, {pn_alias: 'new-identity'}],
    ['', {pn_routes: 'routes-id'}, {pn_routes: 'routes-id'}],
    [
        'a=b;pn_alias=old',
        {pn_root: 'root-id', pn_routes: 'routes-id'},
        {a: 'b', pn_root: 'root-id', pn_routes: 'routes-id'}
    ],
    ['pn_root=root-id;pn_routes=routes-id', {pn_alias: 'social'}, {pn_alias: 'social'}],
    ['pn_root=root-id;a=b;pn_routes=routes-id', {pn_alias: 'social'}, {a: 'b', pn_alias: 'social'}],
    [
        'pn_root=root-id;pn_routes=routes-id',
        {pn_addr: '0xF5277b8B7a620f1E04a4a205A6e552D084BBf76B'},
        {
            pn_root: 'root-id',
            pn_routes: 'routes-id',
            pn_addr: '0xF5277b8B7a620f1E04a4a205A6e552D084BBf76B'
        }
    ],
    [
        'pn_addr=0xF5277b8B7a620f1E04a4a205A6e552D084BBf76B;pn_alias=aka',
        {pn_addr: '0x5F13B25C1cA5d121aF55482679393064ad3C448D'},
        {pn_addr: '0x5F13B25C1cA5d121aF55482679393064ad3C448D', pn_alias: 'aka'}
    ],
    [
        'pn_addr=0xF5277b8B7a620f1E04a4a205A6e552D084BBf76B;pn_root=root-id;pn_routes=routes-id',
        {pn_alias: 'aka'},
        {pn_addr: '0xF5277b8B7a620f1E04a4a205A6e552D084BBf76B', pn_alias: 'aka'}
    ],
    [
        'pn_addr=0xF5277b8B7a620f1E04a4a205A6e552D084BBf76B;pn_root=root-id;pn_routes=routes-id',
        {pn_root: 'new-root', pn_routes: 'new-routes'},
        {
            pn_addr: '0xF5277b8B7a620f1E04a4a205A6e552D084BBf76B',
            pn_root: 'new-root',
            pn_routes: 'new-routes'
        }
    ]
];

describe('merge', () => {
    test.each(mergeTestCases)('merges %s and %s', (str, obj, expected) => {
        expect(merge(str, obj)).toEqual(expected);
    });
});
