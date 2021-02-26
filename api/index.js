const fastify = require('fastify');
const { checkRegisteredToken, registerToken } = require('../client/storage/payments');

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
        const routes = require('../resources/api_routes');

        /*
         * Example: ['GET', '/ping', 'ping'],
         */

        for (let route of routes) {
            let [controllerName, actionName] = route[2].split('@');

            this.server.route({
                method: route[0],
                url: route[1],
                // this function is executed for every request before the handler is executed
                preHandler: async (request, reply) => {
                    // E.g. check authentication
                },
                handler: async (request, reply) => {
                    let controller = new (require('./controllers/'+controllerName))(this.ctx, request);
                    return controller[actionName]();
                }
            });
        }
    }
}

module.exports = ApiServer;