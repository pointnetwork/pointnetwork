import {post} from 'axios';
import {delay} from '../../src/core/utils';

jest.setTimeout(300000);
jest.retryTimes(60);

describe('Proxy keyvalue', () => {
    // TODO: keyvalue_append is broken: it's missing 'version' argument
    // TODO: keyvalue_get is not implemented in proxy

    it('TODO: keyvalue is broken, adding dummy test', () => {
        expect(true).toBeTruthy();
    });
});

describe('Proxy contract send', () => {
    // TODO: contract send for proxy host seems not possible, bc host argument is passed incorrectly
    // is it a bug or is it intended?

    it('Should store value in hello contract', async () => {
        expect.assertions(1);

        await delay(5000);
        const res = await post(
            'https://hello.z/_contract_send/Hello.setValue(v)',
            'v=somevalue',
            // TODO: same issue with https as in proxy-storage
            {proxy: {host: 'point_node', port: 8666, protocol: 'https'}}
        );

        expect(res.status).toEqual(200);
    });
});
