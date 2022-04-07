import {FastifyInstance, FastifyRequest} from 'fastify';
import axios from 'axios';
import config from 'config';

const API_URL = `http://${config.get('api.address')}:${config.get('api.port')}`;

const attachApiHandler = (server: FastifyInstance) => {
    server.get('/v1/api/*', async (req: FastifyRequest<{Params: {'*': string}}>, res) => {
        const apiRes = await axios.get(
            `${API_URL}/v1/api/${req.params['*']}`,
            {
                validateStatus: () => true,
                headers: req.headers
            }
        );

        for (const key in apiRes.headers) {
            res.header(key, apiRes.headers[key]);
        }
        res.status(apiRes.status).send(apiRes.data);
    });

    server.post(
        '/v1/api/*',
        async (req: FastifyRequest<{Params: {'*': string}}>, res) => {
            const apiRes = await axios.post(
                `${API_URL}/v1/api/${req.params['*']}`,
                req.body,
                {
                    validateStatus: () => true,
                    headers: req.headers
                }
            );

            for (const key in apiRes.headers) {
                res.header(key, apiRes.headers[key]);
            }
            res.status(apiRes.status).send(apiRes.data);
        });
};

export default attachApiHandler;
