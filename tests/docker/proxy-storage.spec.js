import {get, post} from 'axios';
import HttpsAgent from 'https-proxy-agent';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import {delay} from '../../src/util';
import {uploadDir} from '../../src/client/storage';
import {TIMEOUTS} from '../timeouts';

const DOCKER_POINT_NODE = 'point_node';
const POINT_NODE = process.env.TEST_POINT_NODE || DOCKER_POINT_NODE;

const httpAgentCfg = {
    host: POINT_NODE,
    port: 8666,
    protocol: 'http'
};

const httpsAgent = new HttpsAgent(httpAgentCfg);

describe('Storage requests through proxy', () => {
    // TODO: multiple files are not handled

    it(
        'Should return 415 if body is not form-data',
        async () => {
            expect.assertions(1);

            const res = await post('https://somehost.point/_storage', 'foo', {
                httpsAgent,
                validateStatus: () => true
            });
            expect(res.status).toEqual(415);
        },
        TIMEOUTS.XS
    );

    it(
        'Should return 404 for non-existing file',
        async () => {
            expect.assertions(1);

            const res = await get(`https://somehost.point/_storage/notexists`, {
                httpsAgent,
                validateStatus: () => true
            });
            expect(res.status).toEqual(404);
        },
        TIMEOUTS.XS
    );

    let fileId;
    it(
        'Should upload file through proxy',
        async () => {
            expect.assertions(1);

            const file = fs.createReadStream(
                path.join(__dirname, '..', 'resources', 'sample-image.jpg')
            );
            const form = new FormData();
            form.append('my_file', file);

            const res = await post('https://somehost.point/_storage/', form, {
                headers: form.getHeaders(),
                httpsAgent
            });
            fileId = res.data.data;
            expect(res.status).toEqual(200);
        },
        TIMEOUTS.XL
    );

    it(
        'Should download file through proxy',
        async () => {
            expect.assertions(1);

            await delay(5000);
            const res = await get(`https://somehost.point/_storage/${fileId}`, {httpsAgent});
            expect(res.status).toEqual(200);
        },
        TIMEOUTS.MD
    );

    // TODO: neither proxy nor API don't handle directory upload, we can only do it
    // using storage method
    let dirId;
    it(
        'TODO: replace this test with uploading folder through proxy',
        async () => {
            expect.assertions(1);
            dirId = await uploadDir(path.join(__dirname, '../resources/sample_folder'));
            expect(dirId).toBeTruthy();
        },
        TIMEOUTS.XXL
    );

    it(
        'Should download uploaded folder',
        async () => {
            expect.assertions(5);
            await delay(5000);

            const res = await get(`https://somehost.point/_storage/${dirId}`, {httpsAgent});

            expect(res.status).toEqual(200);
            expect(res.data).toMatch(/^<html>/);
            expect(res.data).toMatch(`<h1>Index of ${dirId}</h1>`);
            expect(res.data).toMatch('sample-image-2.jpg');
            expect(res.data).toMatch('sample-image-3.jpg');
        },
        TIMEOUTS.MD
    );
});
