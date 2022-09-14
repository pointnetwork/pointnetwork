import http, {RequestListener} from 'http';
import config from 'config';
import logger from '../../core/log';
import net from 'net';
import httpsServer from './httpsServer';

const log = logger.child({module: 'Proxy'});
const PROXY_PORT = Number(config.get('zproxy.port'));
const SERVER_PORT = Number(config.get('zproxy.server_port'));
const SERVER_HTTP_PORT = Number(config.get('zproxy.server_http_port'));

// Redirects http to https to the same host
const redirectToHttpsHandler: RequestListener = function(request, response) {
    // Redirect to https
    const Location = request.url!.replace(/^(http:\/\/)/, 'https://');
    log.trace({Location}, 'Redirecting to https');
    response.writeHead(301, {Location});
    response.end();
};

const redirectToHttpsServer = http.createServer(redirectToHttpsHandler);
redirectToHttpsServer.on('error', err => log.error(err, 'redirectToHttpsServer Error:'));
redirectToHttpsServer.on('connect', (req, cltSocket, head) => {
    // connect to an origin server
    const srvSocket = net.connect(PROXY_PORT, 'localhost', () => {
        cltSocket.write(
            'HTTP/1.1 200 Connection Established\r\n' + 'Proxy-agent: Node.js-Proxy\r\n' + '\r\n'
        );
        srvSocket.write(head);
        srvSocket.pipe(cltSocket);
        cltSocket.pipe(srvSocket);
    });
});

// Proxy server, redirecting everything to the main server
const proxyServer = net.createServer();
proxyServer.on('connection', clientToProxySocket => {
    clientToProxySocket.setKeepAlive(true);
    let proxyToServerSocket: net.Socket;

    clientToProxySocket.on('error', error => {
        log.error({error}, 'Client to proxy socket error');
    });

    clientToProxySocket.on('close', hadError => {
        if (hadError) {
            log.error('Client to proxy socket closed with error');
        } else {
            log.debug('Client to proxy socket closed');
        }
    });

    clientToProxySocket.on('end', () => {
        log.debug('Client to proxy socket end by client');
        if ((proxyToServerSocket as any)?.readyState === 'open') {
            log.debug('Sending end to proxy to server socket');
            proxyToServerSocket.end();
        }
    });

    // We need only the data once, the starting packet
    clientToProxySocket.once('data', data => {
        clientToProxySocket.pause();
        const isTLSConnect = data.toString().indexOf('CONNECT') !== -1;
        const isHTTPSConnection = data[0] === 22;

        proxyToServerSocket = net.createConnection({
            host: 'localhost',
            port: isTLSConnect || isHTTPSConnection ? SERVER_PORT : SERVER_HTTP_PORT
        });

        proxyToServerSocket.on('connect', () => {
            proxyToServerSocket.setKeepAlive(true);
            if (isTLSConnect) {
                //Send Back OK to HTTPS CONNECT Request
                clientToProxySocket.write(
                    'HTTP/1.1 200 Connection Established\r\n' +
                    'Proxy-agent: Node.js-Proxy\r\n' +
                    '\r\n'
                );
            }

            proxyToServerSocket.on('error', error => {
                log.error({error}, 'Proxy to server socket error');
            });

            proxyToServerSocket.on('close', hadError => {
                if (hadError) {
                    log.error('Proxy to server socket closed with error');
                } else {
                    log.debug('Proxy to server socket closed');
                }
            });

            proxyToServerSocket.on('end', () => {
                log.debug('Proxy to server socket end by server');
                if ((clientToProxySocket as any).readyState === 'open') {
                    log.debug('Sending end to client to proxy socket');
                    clientToProxySocket.end();
                }
            });

            // Piping the sockets
            proxyToServerSocket.pipe(clientToProxySocket);
            clientToProxySocket.pipe(proxyToServerSocket);
        });
    });
});

proxyServer.on('error', error => {
    log.error({error}, 'Proxy error');
});

const startProxy = async () => {
    await httpsServer.listen(SERVER_PORT);
    await redirectToHttpsServer.listen(SERVER_HTTP_PORT);
    await proxyServer.listen(PROXY_PORT);

    log.info(`Proxy started on port ${PROXY_PORT}`);
};

export default startProxy;
