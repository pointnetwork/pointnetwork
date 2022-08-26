import {FastifyInstance, FastifyRequest} from 'fastify';
import axios, {AxiosRequestHeaders} from 'axios';
import config from 'config';

const API_URL = `http://${config.get('api.address')}:${config.get('api.port')}`;

const attachApiHandler = (server: FastifyInstance) => {
    server.get('/v1/api/*', async (req: FastifyRequest<{
        Params: {'*': string};
        Querystring: Record<string, string>;
    }>, res) => {
        try {
            const query = new URLSearchParams(req.query).toString();
            const apiRes = await axios.get(
                `${API_URL}/v1/api/${req.params['*']}${query ? `?${query}` : ''}`,
                {
                    validateStatus: () => true,
                    headers: req.headers as AxiosRequestHeaders
                }
            );

            for (const key in apiRes.headers) {
                res.header(key, apiRes.headers[key]);
            }
            res.status(apiRes.status).send(apiRes.data);
        } catch (e) {
            res.status(500).send({success: false, error: e.message});
        }
    });

    server.post(
        '/v1/api/*',
        async (req: FastifyRequest<{
            Params: {'*': string};
            Querystring: Record<string, string>;
        }>, res) => {
            try {
                const query = new URLSearchParams(req.query).toString();
                const apiRes = await axios.post(
                    `${API_URL}/v1/api/${req.params['*']}${query ? `?${query}` : ''}`,
                    req.body,
                    {
                        validateStatus: () => true,
                        headers: req.headers as AxiosRequestHeaders
                    }
                );

                for (const key in apiRes.headers) {
                    res.header(key, apiRes.headers[key]);
                }
                res.status(apiRes.status).send(apiRes.data);
            } catch (e) {
                res.status(500).send({status: 'error', error: e.toString()});
            }
        });
};

export default attachApiHandler;
