import apiServer from '../../src/api/server';

describe('Status controller', () => {
    it('Ping', async () => {
        expect.assertions(2);

        const res = await apiServer.inject({
            method: 'GET',
            url: 'https://ping.point/v1/api/status/ping',
            headers: {host: 'ping.point'}
        });
        
        expect(res.statusCode).toEqual(200);
        expect(res.payload).toEqual(JSON.stringify({
            status: 200,
            data: {ping: 'pong'},
            headers: {}
        }));
    });

    it('Meta', async () => {
        expect.assertions(2);

        const res = await apiServer.inject({
            method: 'GET',
            url: 'https://meta.point/v1/api/status/meta',
            headers: {host: 'meta.point'}
        });

        expect(res.statusCode).toEqual(200);
        expect(JSON.parse(res.payload)).toEqual({
            status: 200,
            data: {
                nodeJsVersion: expect.any(String),
                pointNodeVersion: expect.any(String),
                apiRoutes: expect.any(Array),
                wsRoutes: expect.any(Array)
            },
            headers: {}
        });
    });
});
