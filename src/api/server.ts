import fastify, {FastifyRequest, HTTPMethods} from 'fastify';
import logger from '../core/log';
import fastifyWs from '@fastify/websocket';
import {transformErrorResp} from '../errors';
import identityMdw from './middleware/identity';
import csrfTokens from '../client/zweb/renderer/csrfTokens';
import config from 'config';
import {verify} from 'jsonwebtoken';
import {getSecretToken} from '../util';
const ws_routes = require('./ws_routes');
const api_routes = require('./api_routes');

let secretToken = '';
const apiServer = fastify({
    logger: logger.child({module: 'ApiServer.server'}),
    pluginTimeout: 20000
    // todo: more configuration?
});
const CSRF_ENABLED = config.get('api.csrf_enabled');

// https://github.com/fastify/fastify-websocket - for websocket support
apiServer.register(fastifyWs, {options: {clientTracking: true}});

for (const apiRoute of api_routes) {
    const [controllerName, actionName] = apiRoute[2].split('@');

    apiServer.route({
        method: apiRoute[0] as HTTPMethods,
        url: apiRoute[1],
        preHandler: identityMdw,
        handler: async (request: FastifyRequest<{Body: Record<string, unknown>}>, reply) => {

            // CSRF check
            const host = request.headers.host;
            // TODO: we are not using CSRF for other hosts, should we?
            if (CSRF_ENABLED && request.method === 'POST' && host === 'point') {
                if (!csrfTokens[host]) {
                    reply.status(403).send('No csrf token generated for this host');
                    return;
                }
                const real_token = csrfTokens[host];
                if (real_token !== request.body._csrf) {
                    reply.status(403).send('Invalid csrf token submitted');
                    return;
                }
            }

            // Auth token check
            // TODO: make proper tests with the token
            if (apiRoute[3]?.protected && process.env.MODE !== 'test') {
                if (!secretToken) {
                    secretToken = await getSecretToken();
                }
                const jwt = request.headers['x-point-token'] as string;
                if (!jwt) {
                    reply.status(401).send('Unauthorized');
                    return;
                }
                try {
                    verify(jwt.replace(/^Bearer\s/, ''), secretToken);
                } catch (e) {
                    reply.status(401).send('Unauthorized');
                    return;
                }
            }

            const controller = new (require('./controllers/' + controllerName))(
                request,
                reply
            );
            return controller[actionName](request, reply);
        }
    });
}

for (const wsRoute of ws_routes) {
    const socketName = wsRoute[2];

    apiServer.route({
        method: wsRoute[0] as HTTPMethods,
        url: wsRoute[1],
        handler: async () => undefined, // needed otherwise 'handler not defined error' is thrown by fastify
        wsHandler: async conn =>
            new (require('./sockets/' + socketName))(
                conn.socket,
                apiServer.websocketServer
            )
    });
}

apiServer.setErrorHandler(function(error, request, reply) {
    request.log.error(error, 'ApiServer error handler');

    const statusCode = error.statusCode ?? 500;
    reply
        .code(statusCode)
        .type('text/plain')
        .send(statusCode >= 500 ? 'Internal engine error' : error.message);
});

apiServer.addHook('preValidation', (request, reply, next) => {
    // some code // todo
    next();
});

apiServer.setNotFoundHandler((request, reply) => {
    reply
        .code(404)
        .type('text/html')
        .send('Not Found');
});

apiServer.addHook('onSend', transformErrorResp);

export default apiServer;
