import http, {RequestListener} from 'http';
import config from 'config';
import logger from '../../core/log';
import net from 'net';
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
        srvSocket.write(head);
        srvSocket.pipe(cltSocket);
        cltSocket.pipe(srvSocket);
    });
});

// Proxy server, redirecting everything to the main server
const proxyServer = net.createServer({keepAlive: true});
const dataByClientPort = {} as {[key: string]: Buffer[]};
proxyServer.on('connection', socket => {
    const socketLog = log.child({port: socket.remotePort});
    // We need only the data once, the starting packet
    const port = String(socket.remotePort);
    const parseHeaders = (headersString: string) => (
        headersString.split('\r\n').reduce((headers, headerString) => {
            const [key, ...values] = headerString.split(':');
            return {...headers, [key.trim()]: values.join(':').trim()};
        }, {})
    );
    const parseRequestData = (buf: Buffer) => {
        const data = buf.toString('ascii').split('\r\n\r\n');
        const bodyString = data.pop();
        const [proxyHeaders, headers] = data.map(parseHeaders);
        const body = bodyString ? Buffer.from(bodyString, 'ascii') : undefined;
        return {proxyHeaders, headers, body};
    };
    const printDataDetails = (msg: string) => {
        const dataBuf = Buffer.concat(dataByClientPort[port]);
        const {proxyHeaders, headers, body} = parseRequestData(dataBuf);
        socketLog.warn({
            bytesRead: socket.bytesRead,
            dataLength: dataBuf.length,
            bodyLength: body && body.length || 0,
            headersLength: dataBuf.length - (body && body.length || 0),
            proxyHeaders,
            headers,
            bytesWritten: socket.bytesWritten,
            connecting: socket.connecting,
            destroyed: socket.destroyed,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            pending: socket.pending,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            timeout: socket.timeout
        }, msg);
    };
    const onTimeout = (msg: string) => (() => {
        clearTimeout(timeout);
        printDataDetails(msg);
    });

    let timeout = setTimeout(onTimeout('Manual socket timeout'), 5000);

    socket.setTimeout(4500, onTimeout('Socket timed out'));
    socket.on('connect', (...args) => socketLog.info({
        args,
        bytesRead: socket.bytesRead
    }, 'Client socket connected'));
    socket.on('close', (...args) => {
        clearTimeout(timeout);
        printDataDetails('Socker has closed successfully');
        socketLog.info({args}, 'Client socket is closed');
    });
    socket.on('end', (...args) => {
        clearTimeout(timeout);
        printDataDetails('Socker has ended successfully');
        socketLog.warn({args}, 'Client socket is ended');
    });
    socket.on('error', (e) => {
        clearTimeout(timeout);
        socketLog.error(e, 'Client socket error');
    });
    socket.on('drain', (...args) => {
        clearTimeout(timeout);
        socketLog.warn({args}, 'Client socket is drained');
    });
    socket.on('data', (chunk) => {
        if (!dataByClientPort[port]) {
            dataByClientPort[port] = [] as Buffer[];
        }
        dataByClientPort[port].push(chunk);
        // socketLog.warn({bytesRead: socket.bytesRead}, 'Client socket data received');
        clearTimeout(timeout);
        timeout = setTimeout(onTimeout('Manual socket timeout'), 6000);
    });

    socket.once('data', buffer => {
        // Pause the socket
        socket.pause();

        // Determine if this is an HTTP(s) request
        const byte = buffer[0];
        log.trace({byte}, 'Connection received');

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
    log.error({error}, 'Proxy error');
});
proxyServer.on('drop', (...args) => {
    log.error({args}, 'Dropped connection');
});

const startProxy = async () => {
    await httpsServer.listen(0);
    await proxyServer.listen(PROXY_PORT);

    log.info(`Proxy started on port ${PROXY_PORT}`);
};

export default startProxy;
