import http, {RequestListener} from 'http';
import config from 'config';
import logger from '../../core/log';
import net from 'node:net';
import httpsServer from './httpsServer';

const log = logger.child({module: 'Proxy'});
const PROXY_PORT = Number(config.get('zproxy.port'));

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
        srvSocket.setKeepAlive(true);
        srvSocket.setNoDelay(true);
        srvSocket.write(head);
        srvSocket.pipe(cltSocket);
        cltSocket.pipe(srvSocket);
    });
});

// Proxy server, redirecting everything to the main server
const proxyServer = net.createServer();
proxyServer.on('connection', proxyServerSocket => {
    proxyServerSocket.setKeepAlive(true);
    proxyServerSocket.setNoDelay(true);

    proxyServerSocket.on('error', e => log.error(e, 'Proxy socket error'));
    proxyServerSocket.once('data', buffer => {
        const isTLSHandshake = buffer[0] === 22; // TLS handshake byte
        const isTLSConnection = buffer.toString().indexOf('CONNECT') !== -1; // TLS connect request
        const isTLS = isTLSHandshake || isTLSConnection;
        const {port} = (
            isTLS ? httpsServer.server.address() : redirectToHttpsServer.address()
        ) as net.AddressInfo;

        // log.warn({
        //     port,
        //     isTLS,
        //     isTLSHandshake,
        //     isTLSConnection,
        //     data: (isTLSConnection || !isTLS) ? buffer.toString('ascii') : 'encrypted'
        // }, 'Proxy server socket received data');

        const httpServerSocket = net.connect(Number(port), 'localhost', () => {
            // log.warn('Successfully connected to the underlying server');

            httpServerSocket.setKeepAlive(true);
            httpServerSocket.setNoDelay(true);
            httpServerSocket.on('error', e => void log.error(e, 'Http socket error'));
            httpServerSocket.on('end', () => {
                log.warn({
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    'httpServerSocket.readyState': httpServerSocket.readyState,
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    'proxyServerSocket.readyState': proxyServerSocket.readyState
                }, 'Http socket has ended');
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                if (proxyServerSocket.readyState === 'open') {
                    proxyServerSocket.end();
                }
            });
    
            if (isTLSConnection) {
                //Send Back OK to HTTPS CONNECT Request
                proxyServerSocket.write('HTTP/1.1 200 OK\r\n\n');
            } else {
                httpServerSocket.write(buffer);
            }
    
            proxyServerSocket.pipe(httpServerSocket);
            httpServerSocket.pipe(proxyServerSocket);
        });
        
        proxyServerSocket.on('end', () => {
            log.warn({
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                'proxyServerSocket.readyState': proxyServerSocket.readyState,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                'httpServerSocket.readyState': httpServerSocket.readyState
            }, 'Proxy socket has ended');
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            if (httpServerSocket.readyState === 'open') {
                httpServerSocket.end();
            }
        });

        // // Pause the socket
        // socket.pause();

        // // Determine if this is an HTTP(s) request
        // const byte = buffer[0];
        // log.trace({byte}, 'Connection received');

        // let proxy;
        // if (byte === 22) {
        //     // HTTPS
        //     proxy = httpsServer.server;
        // } else if (32 < byte && byte < 127) {
        //     // HTTP
        //     proxy = redirectToHttpsServer;
        // } else {
        //     // TODO:
        //     const error = new Error(`Expected protocols: "http", "https". Actual: ${byte}`);
        //     log.error(error, 'Access Runtime Error');
        //     process.exit(1);
        // }

        // if (proxy) {
        //     // Push the buffer back onto the front of the data stream
        //     socket.unshift(buffer);

        //     // Emit the socket to the HTTP(s) server
        //     proxy.emit('connection', socket);
        // }

        // // As of NodeJS 10.x the socket must be
        // // resumed asynchronously or the socket
        // // connection hangs, potentially crashing
        // // the process. Prior to NodeJS 10.x
        // // the socket may be resumed synchronously.
        // process.nextTick(() => socket.resume());
    });
});

proxyServer.on('error', error => {
    log.error({error}, 'Proxy error');
});

const startProxy = async () => {
    await httpsServer.listen({port: 0});
    await redirectToHttpsServer.listen();

    log.warn({
        'httpsServer.server.address()': httpsServer.server.address(),
        'redirectToHttpsServer.address()': redirectToHttpsServer.address()
    }, 'Address details');

    await proxyServer.listen(PROXY_PORT);

    log.info(`Proxy started on port ${PROXY_PORT}`);
};

export default startProxy;
