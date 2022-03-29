import {get} from 'axios';
import {delay} from '../../src/core/utils';
import HttpAgent from 'http-proxy-agent';
import HttpsAgent from 'https-proxy-agent';

jest.retryTimes(60);

const httpsAgent = new HttpsAgent({
    host: 'point_node',
    port: 8666,
    protocol: 'http'
});

const httpAgent = new HttpAgent({
    host: 'point_node',
    port: 8666,
    protocol: 'http'
});

describe('Proxy', () => {
    it('Should redirect from http://point to https://point', async () => {
        expect.assertions(2);

        const res = await get(
            'http://point',
            {
                httpAgent,
                maxRedirects: 0,
                validateStatus: () => true
            }
        );
        expect(res.status).toEqual(301);
        expect(res.headers.location).toEqual('https://point');
    });

    it('Should return https://point HTML', async () => {
        expect.assertions(4);

        const res = await get(
            'https://point',
            {httpsAgent}
        );
        expect(res.status).toEqual(200);
        expect(res.data).toMatch(/^<html>/);
        expect(res.data).toMatch('<title>Point Explorer</title>');
        expect(res.data).toMatch('Welcome to Web 3.0');
    });

    it('Should return https://blog.point HTML', async () => {
        expect.assertions(3);

        await delay(5000);
        const res = await get(
            'https://blog.point',
            {httpsAgent}
        );
        expect(res.status).toEqual(200);
        expect(res.data).toMatch(/^<!doctype html>/);
        expect(res.data).toMatch('<title>Example Blog</title>');
    }, 300000);

    it('Should return 404 for non-existing file', async () => {
        expect.assertions(1);

        await delay(5000);
        const res = await get(
            'https://blog.point/notexists',
            {
                httpsAgent,
                validateStatus: () => true
            }
        );
        expect(res.status).toEqual(404);
    }, 300000);

    it('Should return https://blog.point file in a root folder', async () => {
        expect.assertions(2);

        await delay(5000);
        const res = await get(
            'https://blog.point/index.css',
            {httpsAgent}
        );
        expect(res.status).toEqual(200);
        expect(res.data).toMatch(/^html, body/);
    }, 300000);

    it('Should return https://blog.point file in a nested folder', async () => {
        expect.assertions(2);

        await delay(5000);
        const res = await get(
            'https://blog.point/img/star_icon.png',
            {httpsAgent}
        );
        expect(res.status).toEqual(200);
        expect(res.headers['content-type']).toEqual('image/png');
    }, 300000);

    it('Should return 404 for host other than point and not ending on .point', async () => {
        expect.assertions(1);

        const res = await get(
            'https://something.net',
            {
                httpsAgent,
                validateStatus: () => true
            }
        );
        expect(res.status).toEqual(404);
    });

    it('Should return 404 for host non-existing .point domain', async () => {
        expect.assertions(1);

        const res = await get(
            'https://notexists.point',
            {
                httpsAgent,
                validateStatus: () => true
            }
        );
        expect(res.status).toEqual(404);
    });
});
