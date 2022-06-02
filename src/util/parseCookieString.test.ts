import {parseCookieString} from './parseCookieString';

type TestCase = [string, Record<string, string>];

const testCases: TestCase[] = [
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
        'ipfs=QmPnNSjCPPNo4ckjaZ5BD82jSjxYJ7MBc5BVv2cWeYE6dn;pn_id=ynet_bareminimum;pn_routes=0x339b11f3cd1fc986d77356f2be50544a38b01fe64b744262e656813827e6555d;pn_root=d7817fbdda33796626b3f2cebe08b422168ac951378392d29ab239232a0cecdd',
        {
            ipfs: 'QmPnNSjCPPNo4ckjaZ5BD82jSjxYJ7MBc5BVv2cWeYE6dn',
            pn_id: 'ynet_bareminimum',
            pn_routes: '0x339b11f3cd1fc986d77356f2be50544a38b01fe64b744262e656813827e6555d',
            pn_root: 'd7817fbdda33796626b3f2cebe08b422168ac951378392d29ab239232a0cecdd'
        }
    ]
];

describe('parseCookieString', () => {
    test.each(testCases)('parses %s into an object', (str, expected) => {
        expect(parseCookieString(str)).toEqual(expected);
    });
});
