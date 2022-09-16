import {createServer} from 'https';
import Fastify from 'fastify';
import fastifyUrlData from '@fastify/url-data';
import fastifyMultipart from '@fastify/multipart';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';
import {transformErrorResp} from '../../errors';
import attachHandlers from './handlers';
import {cors} from './middleware';
import logger from '../../core/log';
import SNICallback from './sni';

const log = logger.child({module: 'Https Server'});
const httpsServer = Fastify({
    serverFactory(handler) {
        const server = createServer({
            SNICallback,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            noDelay: true,
            keepAlive: true,
            maxHeaderSize: 32768
        }, handler);
        server.on('error', e => log.error(e, 'HTTPS server error:'));
        return server;
    },
    trustProxy: '127.0.0.1',
    logger: log.child({module: 'Https Fastify server'}, {level: 'warn'})
});

httpsServer.register(fastifyUrlData);
httpsServer.register(fastifyMultipart, {limits: {fileSize: 100_000_000, files: 1}});
httpsServer.register(fastifyFormBody);
httpsServer.register(fastifyWs);

httpsServer.addHook('preHandler', cors);
httpsServer.addHook('onSend', transformErrorResp);

// httpsServer.get('/', (req, res) => {
//     log.warn('Success');
//     res.status(200).send('Hello!');
// });
attachHandlers(httpsServer);

export default httpsServer;
