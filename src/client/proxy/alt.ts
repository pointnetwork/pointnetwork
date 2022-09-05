import http from 'http';
import net from 'net';
import httpProxy from 'http-proxy';
import url from 'url';
import logger from '../../core/log';
import config from 'config';
import httpsServer from './httpsServer';

const log = logger.child({module: 'Alt Proxy'});

const PROXY_PORT = Number(config.get('zproxy.port'));

const server = http.createServer((req, res) => {
    const urlObj = url.parse(req.url || '');
    const target = urlObj.protocol + '//' + urlObj.host;
    log.warn({target}, 'Proxy HTTP request');

    const proxy = httpProxy.createProxyServer({});
    proxy.on('error', (err, _req, res) => {
        log.error({err}, 'Proxy error');
        res.end();
    });

    proxy.web(req, res, {target});
});

const getHostPortFromString = (hostString: string, defaultPort: number): [string, number] => {
    let host = hostString;
    let port = defaultPort;
    const result = /^([^:]+)(:([0-9]+))?$/.exec(hostString);
    if (result != null) {
        host = result[1];
        if (result[2] != null) {
            port = Number(result[3]);
        }
    }
    return [host, port];
};

server.addListener('connect', function(req, socket, bodyhead) {
    const hostPort = getHostPortFromString(req.url || '', 443);
    let hostDomain = hostPort[0];
    let port = hostPort[1];
    log.warn({hostDomain, port}, 'Proxying HTTPS request');

    if (hostDomain === 'point') {
        hostDomain = 'localhost';
        port = 9000;
    }

    const proxySocket = new net.Socket();
    proxySocket.connect(port, hostDomain, function() {
        proxySocket.write(bodyhead);
        socket.write('HTTP/' + req.httpVersion + ' 200 Connection established\r\n\r\n');
    });

    proxySocket.on('data', function(chunk) {
        socket.write(chunk);
    });

    proxySocket.on('end', function() {
        socket.end();
    });

    proxySocket.on('error', function() {
        socket.write('HTTP/' + req.httpVersion + ' 500 Connection error\r\n\r\n');
        socket.end();
    });

    socket.on('data', function(chunk) {
        proxySocket.write(chunk);
    });

    socket.on('end', function() {
        proxySocket.end();
    });

    socket.on('error', function() {
        proxySocket.end();
    });
});

const startProxy = async () => {
    await httpsServer.listen(9000);
    server.listen(PROXY_PORT);
    log.warn(`Proxy started on port ${PROXY_PORT}`);
};

export default startProxy;
