import https from 'https';
import http, {RequestListener} from 'http';
import config from 'config';
import Fastify from 'fastify';
import certificates from './certificates';
import tls from 'tls';
import logger from '../../core/log';
import net from 'net';
import attachHandlers from './handlers';
import fastifyUrlData from 'fastify-url-data';
import fastifyMultipart from 'fastify-multipart';
import fastifyFormBody from 'fastify-formbody';
// import {WebSocketServer} from 'ws';
import fastifyWs from 'fastify-websocket';
import ZProxySocketController from '../../api/sockets/ZProxySocketController';

const log = logger.child({module: 'Proxy'});
const PROXY_PORT = Number(config.get('zproxy.port'));
// const createWsServer = (server: Server, ctx: any) => {
//     const wssLog = log.child({module: 'Proxy.WsServer'});
//     try {
//         const wss = new WebSocketServer({noServer: true});

//         wss.on('request', (request) => {
//             const socket = request.accept(null, request.origin);
//             const parsedUrl = new URL(request.origin);

//             wssLog.debug({parsedUrl, h: parsedUrl.hostname}, 'WS request accepted');

//             new ZProxySocketController(ctx, socket, wss, parsedUrl.hostname);

//             socket.on('message', (msg: any) => wssLog.debug({msg}, 'Clumsy message'));
//             socket.on('close', (code: number) => wssLog.debug({code}, 'WS Client disconnected'));
//             socket.on('error', (error: Error) => wssLog.error(error, 'WS request error'));
//         });

//         wss.on('error', e => void wssLog.error(e, 'Error from WebSocketServer:'));
//         wss.on('message', (msg) => wssLog.debug({msg}, 'Clumsy message 22222222'));

//         server.on('upgrade', (req, socket, head) => (
//             wss.handleUpgrade(req, socket, head, ws => void wss.emit('connection', ws, req))
//         ));

//         wss.on('upgradeError', e => void wssLog.error(e, 'WS server upgrade error'));
//         wss.on('connect', () => void wssLog.debug('WS server connection'));

//         return wss;
//     } catch (e) {
//         wssLog.error(e, 'WS server error');
//         throw e;
//     }
// };

const httpsServer = Fastify({
    serverFactory(handler) {
        const server = https.createServer({
            SNICallback: (servername, cb) => {
                const certData = certificates.getCertificate(servername);
                const ctx = tls.createSecureContext(certData);

                if (!ctx) {
                    log.debug({servername}, `Not found SSL certificate for host`);
                } else {
                    log.debug({servername}, `SSL certificate has been found and assigned`);
                }

                if (typeof cb !== 'function') {
                    return ctx;
                }

                cb(null, ctx);
            }
        }, handler);

        server.on('error', e => log.error(e, 'HTTPS server error:'));

        return server;
    },
    trustProxy: '127.0.0.1',
    logger: log
});
httpsServer.register(fastifyUrlData);
httpsServer.register(fastifyMultipart);
httpsServer.register(fastifyFormBody);
httpsServer.register(fastifyWs);

// Redirects http to https to the same host
const redirectToHttpsHandler: RequestListener = function(request, response) {
    // Redirect to https
    const Location = request.url!.replace(/^(http:\/\/)/, 'https://');
    log.trace({Location}, 'Redirecting to https');
    response.writeHead(301, {Location});
    response.end();
};

const redirectToHttpsServer = http.createServer(redirectToHttpsHandler);
redirectToHttpsServer.on('error', (err) => log.error(err, 'redirectToHttpsServer Error:'));
redirectToHttpsServer.on('connect', (req, cltSocket, head) => {
    // connect to an origin server
    // const srvUrl = url.parse(`https://${req.url}`);
    // const srvSocket = net.connect(srvUrl.port, srvUrl.hostname, () => {
    const srvSocket = net.connect(PROXY_PORT, 'localhost', () => {
        cltSocket.write('HTTP/1.1 200 Connection Established\r\n' +
            'Proxy-agent: Node.js-Proxy\r\n' +
            '\r\n');
        srvSocket.write(head);
        srvSocket.pipe(cltSocket);
        cltSocket.pipe(srvSocket);
    });
});

// Proxy server, redirecting everything to the main server
const proxyServer = net.createServer();
proxyServer.on('connection', socket => {
    // We need only the data once, the starting packet
    socket.once('data', buffer => {
        // Pause the socket
        socket.pause();

        // Determine if this is an HTTP(s) request
        const byte = buffer[0];
        log.info({byte}, 'Connection received');

        let proxy;
        if (byte === 22) {
            // HTTPS
            proxy = httpsServer.server;
        } else if (32 < byte && byte < 127) {
            // HTTP
            proxy = redirectToHttpsServer;
        } else {
            // TODO:
            const error = new Error(`Expected protocols: "http", "https". Actual: ${byte}`);
            log.error(error, 'Access Runtime Error');
        }

        if (proxy) {
            // Push the buffer back onto the front of the data stream
            socket.unshift(buffer);

            // Emit the socket to the HTTP(s) server
            proxy.emit('connection', socket);
        }

        // As of NodeJS 10.x the socket must be
        // resumed asynchronously or the socket
        // connection hangs, potentially crashing
        // the process. Prior to NodeJS 10.x
        // the socket may be resumed synchronously.
        process.nextTick(() => socket.resume());
    });
});

proxyServer.on('error', error => {
    log.error({error}, 'Proxy server error');
});

// TODO: ctx is needed for Renderer, remove it later
const startProxy = async (ctx: any) => {
    // Main logic is here

    // TODO: move it to the root once we get rid of ctx
    attachHandlers(httpsServer, ctx);
    httpsServer.route({
        method: 'GET',
        url: '/',
        handler: () => undefined, // needed otherwise 'handler not defined error' is thrown by fastify
        wsHandler: conn => {
            new ZProxySocketController(ctx, conn.socket, httpsServer.websocketServer, 'point');
        }
    });

    await httpsServer.listen(0);

    // TODO: move it to the root once we get rid of ctx
    // createWsServer(httpsServer.server, ctx);

    await proxyServer.listen(PROXY_PORT);

    log.info(`Proxy started on port ${PROXY_PORT}`);
};

export default startProxy;
