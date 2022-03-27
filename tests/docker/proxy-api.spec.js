import {get, post} from 'axios';
import HttpsAgent from 'https-proxy-agent';

const httpsAgent = new HttpsAgent({
    host: 'point_node',
    port: 8666,
    protocol: 'http'
});

describe('API requests through proxy', () => {
    // TODO: check cases for malformed body and other inappropriate requests
    // (but this depends on API, not proxy - the latter just forwards response with its status)
    it('API GET: should return meta info', async () => {
        expect.assertions(3);

        const res = await get(
            'https://blog.z/v1/api/status/meta',
            {httpsAgent}
        );

        expect(res.status).toEqual(200);
        expect(res.data.data.nodeJsVersion).toBeTruthy();
        expect(res.data.data.pointNodeVersion).toBeTruthy();
    }, 10000);

    it('Should return 404 for non-existing GET request', async () => {
        expect.assertions(1);

        const res = await get(
            'https://blog.z/v1/api/something/that/not/exists',
            {
                httpsAgent,
                validateStatus: () => true
            }
        );

        expect(res.status).toEqual(404);
    }, 10000);

    it('Should return 404 for non-existing POST request', async () => {
        expect.assertions(1);

        const res = await post(
            'https://blog.z/v1/api/something/that/not/exists',
            {},
            {
                httpsAgent,
                validateStatus: () => true
            }
        );

        expect(res.status).toEqual(404);
    }, 10000);

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
