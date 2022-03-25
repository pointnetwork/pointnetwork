import {get, post} from 'axios';
import {delay} from '../../src/core/utils';
import HttpsAgent from 'https-proxy-agent';

jest.retryTimes(60);

const httpsAgent = new HttpsAgent({
    host: 'point_node',
    port: 8666,
    protocol: 'http'
});

describe('Proxy keyvalue', () => {
    it('Should append keyvalue', async () => {
        expect.assertions(2);

        await delay(5000);
        const res = await post(
            'https://blog.z/_keyvalue_append/foo',
            JSON.stringify({foo: 'bar', baz: 123}),
            {
                headers: {'content-type': 'application/json'},
                httpsAgent
            }
        );

        expect(res.status).toEqual(200);
        expect(res.data).toEqual('Success');
    }, 300000);

    it('Should get keyvalue', async () => {
        expect.assertions(3);

        await delay(5000);
        const res = await get(
            'https://blog.z/_keyvalue_get/foo0',
            {httpsAgent}
        );

        expect(res.status).toEqual(200);
        expect(res.data.foo).toEqual('bar');
        expect(res.data.baz).toEqual(123);
    }, 300000);

    it('Should return null for non-existing keyvalue', async () => {
        expect.assertions(2);

        const res = await get(
            'https://blog.z/_keyvalue_get/notexists',
            {httpsAgent}
        );

        expect(res.status).toEqual(200);
        expect(res.data).toEqual(null);
    }, 300000);
});

// describe('Proxy contract send', () => {
//     // TODO: contract send for point host seems not possible, bc host argument is passed incorrectly
//     // is it a bug or is it intended?
//
//     it('Should store value in blog contract', async () => {
//         expect.assertions(1);
//
//         await delay(5000);
//         const res = await post(
//             'https://blog.z/_contract_send/Blog.createArticle(title,contents)',
//             'title=test_title&storage[contents]=some_contents',
//             // TODO: same issue with https as in proxy-storage
//             {proxy: {host: 'point_node', port: 8666, protocol: 'https'}}
//         );
//
//         expect(res.status).toEqual(200);
//     }, 300000);
//
//     // TODO: trying to call a contract method without arguments fails with 500
//     // it('Should retrieve articles in blog contract', async () => {
//     //     expect.assertions(1);
//     //
//     //     await delay(5000);
//     //     const res = await post(
//     //         'https://blog.z/_contract_send/Blog.getArticles()',
//     //         '',
//     //         // TODO: same issue with https as in proxy-storage
//     //         {proxy: {host: 'point_node', port: 8666, protocol: 'https'}}
//     //     );
//     //
//     //     expect(res.status).toEqual(200);
//     // }, 300000);
//
//     // TODO: this method works, but it's useless, as it returns nothing
//     it('Should retrieve stored atricle in blog contract', async () => {
//         expect.assertions(1);
//
//         await delay(5000);
//         const res = await post(
//             'https://blog.z/_contract_send/Blog.getArticle(id)',
//             'id=1',
//             // TODO: same issue with https as in proxy-storage
//             {proxy: {host: 'point_node', port: 8666, protocol: 'https'}}
//         );
//
//         expect(res.status).toEqual(200);
//     }, 300000);
// });
