import {createServer} from 'https';
import Fastify from 'fastify';
import logger from '../../core/log';
import fastifyUrlData from '@fastify/url-data';
import fastifyMultipart from '@fastify/multipart';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';
import httpsRedirect from 'fastify-https-redirect';
import {transformErrorResp} from '../../errors';
import attachHandlers from './handlers';
import {cors} from './middleware';
import SNICallback from './sni';

const log = logger.child({module: 'Https Server'});
const httpsServer = Fastify({
    serverFactory(handler) {
        const server = createServer({SNICallback}, handler);
        server.on('error', e => log.error(e, 'HTTPS server error:'));
        return server;
    }
    // trustProxy: '127.0.0.1',
    // logger: log
});

httpsServer.register(httpsRedirect);
httpsServer.register(fastifyUrlData);
httpsServer.register(fastifyMultipart, {limits: {fileSize: 100_000_000, files: 1}});
httpsServer.register(fastifyFormBody);
httpsServer.register(fastifyWs);

httpsServer.addHook('preHandler', cors);
httpsServer.addHook('onSend', transformErrorResp);

attachHandlers(httpsServer);

export default httpsServer;
