const fastify = require('fastify');
const fastifyWs = require('fastify-websocket');
const config = require('config');
const {transformErrorResp} = require('../errors');
const identityMdw = require('./middleware/identity');
const logger = require('../core/log');
const log = logger.child({module: 'ApiServer'});

class ApiServer {
    constructor(ctx) {
        this.ctx = ctx;
        this.config = config.get('api');
    }

    async start() {
        this.server = fastify({
            logger: logger.child({module: 'ApiServer.server'}),
            pluginTimeout: 20000
            // todo: more configuration?
        });

        try {
            // https://github.com/fastify/fastify-websocket - for websocket support
            this.server.register(fastifyWs, {options: {clientTracking: true}});

            this.connectRoutes();

            this.server.setErrorHandler(function(error, request, reply) {
                request.log.error(error, 'ApiServer error handler');

                const statusCode = error.statusCode >= 400 ? error.statusCode : 500;
                reply
                    .code(statusCode)
                    .type('text/plain')
                    .send(statusCode >= 500 ? 'Internal engine error' : error.message);
            });

            this.server.addHook('preValidation', (request, reply, next) => {
                // some code // todo
                next();
            });

            this.server.decorate('notFound', (request, reply) => {
                reply
                    .code(404)
                    .type('text/html')
                    .send('Not Found');
            });

            this.server.setNotFoundHandler(this.server.notFound);

            this.server.addHook('onSend', transformErrorResp);

            await this.server.listen(parseInt(this.config.port), this.config.address, async err => {
                if (err) {
                    log.error(err, 'Error from API server');
                }
            });
        } catch (err) {
            log.error(err);
        }
    }

    connectRoutes() {
        /*
         * Example: ['GET', '/api/ping', 'PingController@ping'],
         */
        const api_routes = require('./api_routes');

        for (const apiRoute of api_routes) {
            const [controllerName, actionName] = apiRoute[2].split('@');

            this.server.route({
                method: apiRoute[0],
                url: apiRoute[1],
                preHandler: identityMdw,
                handler: async (request, reply) => {
                    const controller = new (require('./controllers/' + controllerName))(
                        this.ctx,
                        request,
                        reply
                    );
                    return controller[actionName](request, reply);
                }
            });
        }

        /*
         * Example: ['GET', '/ws/node', 'NodeSocket'],
         */
        const ws_routes = require('./ws_routes');

        for (const wsRoute of ws_routes) {
            const socketName = wsRoute[2];

            this.server.route({
                method: wsRoute[0],
                url: wsRoute[1],
                handler: async () => undefined, // needed otherwise 'handler not defined error' is thrown by fastify
                wsHandler: async conn =>
                    new (require('./sockets/' + socketName))(
                        this.ctx,
                        conn.socket,
                        this.server.websocketServer
                    )
            });
        }
    }
}

module.exports = ApiServer;
