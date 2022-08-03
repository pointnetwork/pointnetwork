import apiServer from '../../src/api/server';
// TODO: replace with import once we refactor it in src
const open = require('open');

jest.mock('open', () => jest.fn(async () => {}));

describe('Web2 controller', () => {
    it('Should return 404 if host is not point', async () => {
        expect.assertions(1);

        const res = await apiServer.inject({
            method: 'POST',
            url: 'https://open.point/v1/api/web2/open',
            body: JSON.stringify({urlToOpen: 'https://example1.com'}),
            headers: {
                'host': 'open.point',
                'Content-Type': 'application/json'
            }
        });

        expect(res.statusCode).toEqual(404);
    });

    it('Should open web2 link', async () => {
        expect.assertions(3);

        const res = await apiServer.inject({
            method: 'POST',
            url: 'https://point/v1/api/web2/open',
            body: JSON.stringify({urlToOpen: 'https://example2.com'}),
            headers: {
                'host': 'point',
                'Content-Type': 'application/json'
            }
        });

        expect(res.statusCode).toEqual(200);
        expect(open).toHaveBeenCalledWith('https://example2.com');
        expect(res.payload).toEqual(JSON.stringify({
            status: 200,
            data: true,
            headers: {}
        }));
    });
});
