import {uploadFile, getFile} from '../../src/client/storage';
import {delay} from '../../src/util';
import {get, post} from 'axios';

describe('Storage upload/download', () => {
    let id;
    it('Should upload a file', async () => {
        expect.assertions(1);

        id = await uploadFile('Test string');
        expect(id).toBeTruthy();
    }, 60000);

    it('Should download an uploaded file', async () => {
        expect.assertions(1);

        await delay(5000);
        const file = await getFile(id);
        expect(file).toEqual('Test string');
    }, 15000);
});

describe('Storage upload/download through API', () => {
    let id;
    it('Should upload a file', async () => {
        expect.assertions(1);

        const res = await post(
            'http://point_node:2468/v1/api/storage/putString',
            {data: 'Test string 2'}
        );
        id = res.data.data;
        expect(id).toBeTruthy();
    }, 60000);

    it('Should download an uploaded file', async () => {
        expect.assertions(1);

        await delay(5000);
        const res = await get(
            `http://point_node:2468/v1/api/storage/getString/${id}`);
        expect(res.data.data).toEqual('Test string 2');
    }, 15000);
});
