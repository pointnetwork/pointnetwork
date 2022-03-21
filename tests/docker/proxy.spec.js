import {get} from 'axios';
import {delay} from '../../src/core/utils';

jest.retryTimes(60);

describe('Proxy', () => {
    it('Should redirect from http://point to https://point', async () => {
        expect.assertions(2);

        const res = await get(
            'http://point',
            {
                proxy: {host: 'point_node', port: 8666, protocol: 'http'},
                maxRedirects: 0,
                validateStatus: () => true
            }
        );
        expect(res.status).toEqual(301);
        expect(res.headers.location).toEqual('https://point/');
    });

    it('Should return https://point HTML', async () => {
        expect.assertions(4);

        const res = await get(
            'https://point',
            {proxy: {host: 'point_node', port: 8666, protocol: 'http'}}
        );
        expect(res.status).toEqual(200);
        expect(res.data).toMatch(/^<html>/);
        expect(res.data).toMatch('<title>Point Explorer</title>');
        expect(res.data).toMatch('Welcome to Web 3.0');
    });

    it('Should return https://hello.z HTML', async () => {
        expect.assertions(3);

        await delay(5000);
        const res = await get(
            'https://hello.z',
            {proxy: {host: 'point_node', port: 8666, protocol: 'http'}}
        );
        expect(res.status).toEqual(200);
        expect(res.data).toMatch(/^<html>/);
        expect(res.data).toMatch('<title>Hello World from Point Network!</title>');
    }, 300000);

    it('Should return 404 for host other than point and not ending on .z', async () => {
        expect.assertions(1);

        const res = await get(
            'https://something.net',
            {
                proxy: {host: 'point_node', port: 8666, protocol: 'http'},
                validateStatus: () => true
            }
        );
        expect(res.status).toEqual(404);
    });

    it('Should return 404 for host non-existing .z domain', async () => {
        expect.assertions(1);

        const res = await get(
            'https://notexists.z',
            {
                proxy: {host: 'point_node', port: 8666, protocol: 'http'},
                validateStatus: () => true
            }
        );
        expect(res.status).toEqual(404);
    });
});
