import {FastifyInstance} from 'fastify';
import axios from 'axios';
import config from 'config';

const API_URL = `http://${config.get('api.address')}:${config.get('api.port')}`;

const attachApiHandler = (server: FastifyInstance) => {
    server.get('/v1/api/*', async (req, res) => {
        const urlData = req.urlData();
        const apiRes = await axios.get(
            // In some cases, urlData is parsed incorrectly and looks like //point/v1/api...
            `${API_URL}${urlData.path!.replace(/^\/\/point/, '')}`,
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
        async (req, res) => {
            const urlData = req.urlData();
            const apiRes = await axios.post(
                // In some cases, urlData is parsed incorrectly and looks like //point/v1/api...
                `${API_URL}${urlData.path!.replace(/^\/\/point/, '')}`,
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
