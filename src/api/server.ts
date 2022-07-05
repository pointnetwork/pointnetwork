import fastify, {HTTPMethods} from 'fastify';
import logger from '../core/log';
import fastifyWs from 'fastify-websocket';
import {transformErrorResp} from '../errors';
import identityMdw from './middleware/identity';
const ws_routes = require('./ws_routes');
const api_routes = require('./api_routes');

const apiServer = fastify({
    logger: logger.child({module: 'ApiServer.server'}),
    pluginTimeout: 20000
    // todo: more configuration?
});

// https://github.com/fastify/fastify-websocket - for websocket support
apiServer.register(fastifyWs, {options: {clientTracking: true}});

for (const apiRoute of api_routes) {
    const [controllerName, actionName] = apiRoute[2].split('@');

    apiServer.route({
        method: apiRoute[0] as HTTPMethods,
        url: apiRoute[1],
        preHandler: identityMdw,
        handler: async (request, reply) => {
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
