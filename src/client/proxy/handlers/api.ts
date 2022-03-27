import {FastifyInstance} from 'fastify';
import axios from 'axios';
import config from 'config';

const API_URL = `http://${config.get('api.address')}:${config.get('api.port')}`;

const attachApiHandler = (server: FastifyInstance) => {
    server.get('/v1/api/*', async (req, res) => {
        const urlData = req.urlData();
        const apiRes = await axios.get(
            `${API_URL}${urlData.path}`,
            {validateStatus: () => true}
        );

        for (const key in apiRes.headers) {
            res.header(key, apiRes.headers[key]);
        }
        res.status(apiRes.status).send(apiRes.data);
    });

    server.post(
        '/v1/api/*',
        async (req, res) => {
            const urlData = req.urlData();
            const apiRes = await axios.post(
                `${API_URL}${urlData.path}`,
                req.body,
                {validateStatus: () => true}
            );

            for (const key in apiRes.headers) {
                res.header(key, apiRes.headers[key]);
            }
            res.status(apiRes.status).send(apiRes.data);
        });
};

export default attachApiHandler;
