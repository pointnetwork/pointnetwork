import {uploadFile, getFile} from '../../src/client/storage';
import {delay} from '../../src/core/utils';
import {get, post} from 'axios';

beforeAll(() => {
    jest.setTimeout(300000);
});

describe('Storage upload/download', () => {
    let id;
    it('Should upload a file', async () => {
        id = await uploadFile('Test string');
        expect(id).toBeTruthy();
    });

    it('Should download an uploaded file', async () => {
        await delay(120000); // Waiting for the file to be mined
        const file = await getFile(id);
        expect(file).toEqual('Test string');
    });
});

describe('Storage upload/download through API', () => {
    let id;
    it('Should upload a file', async () => {
        const res = await post(
            'http://point_node:2468/v1/api/storage/putString',
            {data: 'Test string 2'}
        );
        id = res.data.data;
        expect(id).toBeTruthy();
    });

    it('Should download an uploaded file', async () => {
        await delay(120000); // Waiting for the file to be mined
        const res = await get(
            `http://point_node:2468/v1/api/storage/getString/${id}`);
        expect(res.data.data).toEqual('Test string 2');
    });
});
