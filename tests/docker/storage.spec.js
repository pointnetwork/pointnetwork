import {uploadFile, getFile} from '../../src/client/storage';
import {delay} from '../../src/util';
import {get, post} from 'axios';
import {TIMEOUTS} from '../timeouts';

describe('Storage upload/download', () => {
    let id;
    it(
        'Should upload a file',
        async () => {
            expect.assertions(1);

            id = await uploadFile('Test string');
            expect(id).toBeTruthy();
        },
        TIMEOUTS.LG
    );

    it(
        'Should download an uploaded file',
        async () => {
            expect.assertions(1);

            await delay(5000);
            const file = await getFile(id);
            expect(file).toEqual('Test string');
        },
        TIMEOUTS.SM
    );
});

describe('Storage upload/download through API', () => {
    let id;
    it(
        'Should upload a file',
        async () => {
            expect.assertions(1);

            const url = 'http://point_node:2468/v1/api/storage/putString';
            const body = {data: 'Test string 2'};
            const res = await post(url, body);
            id = res.data.data;
            expect(id).toBeTruthy();
        },
        TIMEOUTS.LG
    );

    it(
        'Should download an uploaded file',
        async () => {
            expect.assertions(1);

            await delay(5000);
            const res = await get(`http://point_node:2468/v1/api/storage/getString/${id}`);
            expect(res.data.data).toEqual('Test string 2');
        },
        TIMEOUTS.SM
    );
});
