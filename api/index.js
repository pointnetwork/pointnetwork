const fastify = require('fastify');
const { checkRegisteredToken, registerToken } = require('../client/storage/payments');
const Next = require('next');

class ApiServer {
    constructor(ctx) {
        this.ctx = ctx;
        this.config = ctx.config.api;
    }

    async start() {
        this.server = fastify({
            logger: this.ctx.log
            // todo: more configuration?
        });

        try {
            // https://github.com/fastify/fastify-nextjs - for react app support
            await this.server.register(require('fastify-nextjs'), { dev: true, dir: './api/web' })
            // https://github.com/fastify/fastify-websocket - for websocket support
            this.server.register(require('fastify-websocket'))
            const web_routes = require('./web_routes')
            await this.server.after(() => {
                web_routes.forEach(route => {this.server.next(route)})
            })
            this.connectRoutes();

            this.server.setErrorHandler(function (error, request, reply) {
                request.log.warn(error);

                var statusCode = error.statusCode >= 400 ? error.statusCode : 500;
                reply
                    .code(statusCode)
                    .type('text/plain')
                    .send(statusCode >= 500
                        ? 'Internal server error'
                        : error.message
                    );
            });

            this.server.addHook('preValidation', (request, reply, next) => {
                // some code // todo
                next()
            });

            await this.server.listen(parseInt(this.config.port), async (err, address) => {
                if (err) throw err;
                if (await checkRegisteredToken() === undefined) await registerToken();
                this.server.log.info(`api_server listening on ${address}`);
            });
        } catch (err) {
            this.server.log.error(err);
            process.exit(1);
        }
    }

    connectRoutes() {
        /*
         * Example: ['GET', '/api/ping', 'PingController@ping'],
         */
        const api_routes = require('./api_routes');

        for (let apiRoute of api_routes) {
            let [controllerName, actionName] = apiRoute[2].split('@');

            this.server.route({
                method: apiRoute[0],
                url: apiRoute[1],

                // this function is executed for every request before the handler is executed
                preHandler: async (request, reply) => {
                    // E.g. check authentication
                },
                handler: async (request, reply) => {
                    let controller = new (require('./controllers/'+controllerName))(this.ctx, request);
                    return controller[actionName]( request, reply );
                }
            });
        }

        const ws_routes = require('./ws_routes');

        for (let wsRoute of ws_routes) {
            let [controllerName, actionName] = wsRoute[2].split('@');

            this.server.route({
                method: wsRoute[0],
                url: wsRoute[1],
                handler: async (request, reply) => {
                    return undefined
                },
                wsHandler: async (conn, req) => {
                    return new (require('./controllers/'+controllerName))(this.ctx, conn);
                    // return controller[actionName]( conn );
                }
            });
        }
    }
}

module.exports = ApiServer;