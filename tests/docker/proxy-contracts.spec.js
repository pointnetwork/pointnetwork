import {get, post} from 'axios';
import {delay} from '../../src/core/utils';
import HttpsAgent from 'https-proxy-agent';

jest.retryTimes(24);

const httpsAgent = new HttpsAgent({
    host: 'point_node',
    port: 8666,
    protocol: 'http'
});

describe('Proxy keyvalue', () => {
    // TODO: add test for storage upload
    it('Should append keyvalue', async () => {
        expect.assertions(2);

        await delay(5000);
        const res = await post(
            'https://blog.point/_keyvalue_append/foo',
            'foo=bar&baz=123',
            {httpsAgent}
        );

        expect(res.status).toEqual(200);
        expect(res.data).toEqual('Success');
    }, 10000);

    it('Should get keyvalue', async () => {
        expect.assertions(3);

        await delay(5000);
        const res = await get(
            'https://blog.point/_keyvalue_get/foo0',
            {httpsAgent}
        );

        expect(res.status).toEqual(200);
        expect(res.data.foo).toEqual('bar');
        // TODO: this is the problem with x-www-form-urlencoded: numbers are not parsed correctly
        expect(res.data.baz).toEqual('123');
    }, 10000);

    it('Should return null for non-existing keyvalue', async () => {
        expect.assertions(2);

        const res = await get(
            'https://blog.point/_keyvalue_get/notexists',
            {httpsAgent}
        );

        expect(res.status).toEqual(200);
        expect(res.data).toEqual(null);
    }, 10000);
});

describe('Proxy contract send', () => {
    // TODO: add test for storage upload
    // TODO: contract send for point host seems not possible, bc host argument is passed incorrectly
    // is it a bug or is it intended?

    it('Should store value in blog contract', async () => {
        expect.assertions(1);

        await delay(5000);
        const res = await post(
            'https://blog.point/_contract_send/Blog.createArticle(title,contents)',
            'title=test_title&storage[contents]=some_contents',
            {httpsAgent}
        );

        expect(res.status).toEqual(200);
    }, 10000);

    // TODO: this is useless, returns nothing.
    it('Should retrieve articles in blog contract', async () => {
        expect.assertions(1);

        await delay(5000);
        const res = await post(
            'https://blog.point/_contract_send/Blog.getArticles()',
            '',
            {httpsAgent}
        );

        expect(res.status).toEqual(200);
    }, 10000);

    it('Should retrieve articles in blog contract', async () => {
        expect.assertions(1);

        await delay(5000);
        const res = await post(
            'https://blog.point/_contract_send/Blog.getArticles()',
            '',
            {httpsAgent}
        );

        expect(res.status).toEqual(200);
    }, 10000);

    // TODO: this method works, but it's useless, as it returns nothing
    it('Should retrieve stored atricle in blog contract', async () => {
        expect.assertions(1);

        await delay(5000);
        const res = await post(
            'https://blog.point/_contract_send/Blog.getArticle(id)',
            'id=1',
            {httpsAgent}
        );

        expect(res.status).toEqual(200);
    }, 10000);
});
