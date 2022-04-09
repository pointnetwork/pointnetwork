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

const log = logger.child({module: 'ZProxy'});

const PROXY_PORT = Number(config.get('zproxy.port'));
const SERVER_PORT = Number(config.get('zproxy.server_port'));
const SERVER_HTTP_PORT = Number(config.get('zproxy.server_http_port'));

// The main server, processing all the business logic
const server = Fastify({
    https: {
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
    },
    logger: log
});
server.register(fastifyUrlData);
server.register(fastifyMultipart);
server.register(fastifyFormBody);

// Redirects http to https to the same host
const redirectToHttpsServer = Fastify();
redirectToHttpsServer.get('*', (req, res) => {
    res.redirect(301, req.headers.host!.startsWith('http://')
        ? req.headers.host!.replace(/^(http:\/\/)/, 'https://')
        : `https://${req.headers.host}`
    );
});

// Proxy server, redirecting everything to the main server
const proxyServer = net.createServer();
proxyServer.on('connection', clientToProxySocket => {
    // We need only the data once, the starting packet
    clientToProxySocket.once('data', data => {
        const isTLSConnect = data.toString().indexOf('CONNECT') !== -1;
        const isHTTPSConnection = data[0] === 22;

        const proxyToServerSocket = net.createConnection(
            {
                host: 'localhost',
                port: isTLSConnect || isHTTPSConnection ? SERVER_PORT : SERVER_HTTP_PORT
            },
            () => {
                if (isTLSConnect) {
                    //Send Back OK to HTTPS CONNECT Request
                    clientToProxySocket.write(
                        'HTTP/1.1 200 Connection Established\r\n' +
                        'Proxy-agent: Node.js-Proxy\r\n' +
                        '\r\n'
                    );
                } else {
                    proxyToServerSocket.write(data);
                }

                // Piping the sockets
                clientToProxySocket.pipe(proxyToServerSocket);
                proxyToServerSocket.pipe(clientToProxySocket);

                proxyToServerSocket.on('error', error => {
                    log.error({error}, 'Proxy to server socket error');
                });
            }
        );

        clientToProxySocket.on('error', error => {
            log.error({error}, 'Client to proxy socket error');
        });
    });
});

proxyServer.on('error', error => {
    log.error({error}, 'Proxy server error');
});

// TODO: ctx is needed for Renderer, remove it later
const startProxy = async (ctx: any) => {
    // TODO: move it to the root once we get rid of ctx
    // Main logic is here
    attachHandlers(server, ctx);

    await Promise.all([
        server.listen(SERVER_PORT),
        proxyServer.listen(PROXY_PORT),
        redirectToHttpsServer.listen(SERVER_HTTP_PORT)
    ]);
    log.info(`Proxy started on port ${PROXY_PORT}`);
};

export default startProxy;
