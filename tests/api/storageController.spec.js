import apiServer from '../../src/api/server';
// TODO: replace with import once we refactor it in src
const {getFile, uploadFile} = require('../../src/client/storage');

jest.mock('../../src/client/storage', () => ({
    // mocked functions cannot reference external modules, so we can't return something
    // like fs.readFile
    getFile: jest.fn(async () => 'some plain text file'),
    uploadFile: jest.fn(async () => 'mock_id')
}));

describe('Storage controller', () => {
    it('Get string', async () => {
        expect.assertions(3);

        const res = await apiServer.inject({
            method: 'GET',
            url: 'https://getString.point/v1/api/storage/getString/mock_id',
            headers: {host: 'getString.point'}
        });

        expect(res.statusCode).toEqual(200);
        expect(getFile).toHaveBeenCalledWith('mock_id', 'utf-8');
        expect(res.payload).toEqual(JSON.stringify({
            status: 200,
            data: 'some plain text file',
            headers: {'content-type': 'text/plain; charset=utf-8'}
        }));
    });

    // TODO: file upload is broken! putString does not accept form-data
    // it('Put string', async () => {
    //     expect.assertions(3);
    //
    //     const file = await fs.readFile(
    //         path.join(__dirname, '../resources/sample-image.jpg')
    //     );
    //     const formData = new FormData();
    //     formData.append('data', file);
    //
    //     const res = await apiServer.inject({
    //         method: 'POST',
    //         url: 'https://putString.point/v1/api/storage/putString',
    //         body: formData,
    //         headers: {
    //             host: 'putString.point',
    //             ...formData.getHeaders()
    //         }
    //     });
    //
    //     expect(res.statusCode).toEqual(200);
    //     expect(uploadFile).toHaveBeenCalledWith(expect.any(Buffer));
    //     expect(res.payload).toEqual(JSON.stringify({
    //         status: 200,
    //         data: 'mock_id',
    //         headers: {}
    //     }));
    // });

    it('Put string', async () => {
        expect.assertions(3);

        const res = await apiServer.inject({
            method: 'POST',
            url: 'https://putString.point/v1/api/storage/putString',
            body: {data: 'some plain text'},
            headers: {
                'host': 'putString.point',
                'content-type': 'application/json'
            }
        });

        expect(res.statusCode).toEqual(200);
        expect(uploadFile).toHaveBeenCalledWith('some plain text');
        expect(res.payload).toEqual(JSON.stringify({
            status: 200,
            data: 'mock_id',
            headers: {}
        }));
    });

    // TODO: files, fileById, chunkById are not used and should be removed
});
