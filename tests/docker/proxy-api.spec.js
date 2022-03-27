import {get} from 'axios';
import {delay} from '../../src/core/utils';
import HttpsAgent from 'https-proxy-agent';

jest.retryTimes(60);

const httpsAgent = new HttpsAgent({
    host: 'point_node',
    port: 8666,
    protocol: 'http'
});

describe('API requests through proxy', () => {
    it('API GET: should return meta info', async () => {
        expect.assertions(3);

        await delay(5000);
        const res = await get(
            'https://blog.z/v1/api/status/meta',
            {httpsAgent}
        );

        expect(res.status).toEqual(200);
        expect(res.data.data.nodeJsVersion).toBeTruthy();
        expect(res.data.data.pointNodeVersion).toBeTruthy();
    }, 300000);

    // TODO: this is broken on API side
    // it('API POST: should make a contract call', async () => {
    //     expect.assertions(1);
    //
    //     await delay(5000);
    //     const res = await post(
    //         'https://blog.z/v1/api/contract/call',
    //         {
    //             contract: 'Blog',
    //             method: 'getArticles',
    //             params: [1]
    //         },
    //         {httpsAgent}
    //     );
    //
    //     expect(res.status).toEqual(200);
    // }, 300000);
});
