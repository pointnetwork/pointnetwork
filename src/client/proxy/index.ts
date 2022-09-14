// import {createServer} from 'https';
// import Fastify from 'fastify';
// import proxy from '@fastify/http-proxy';
// import {AddressInfo} from 'net';
import config from 'config';
import logger from '../../core/log';
import httpsServer from './httpsServer';
// import SNICallback from './sni';

const log = logger.child({module: 'Proxy'});
const PROXY_PORT = Number(config.get('zproxy.port'));

const startProxy = async () => {
    await httpsServer.listen({port: PROXY_PORT});

    // const {address, port} = httpsServer.server.address() as AddressInfo;

    // log.debug({address, port}, 'Https server is started');

    // const proxyServer = Fastify({
    //     logger: log,
    //     serverFactory(handler) {
    //         return createServer({SNICallback}, handler)
    //             .on('error', e => log.error(e, 'HTTPS server error:'));
    //     }
    // });

    // proxyServer.register(httpsRedirect);
    // proxyServer.register(proxy, {
    //     upstream: `https://${address}:${port}`,
    //     websocket: true
    // });

    // await proxyServer.listen({port: PROXY_PORT});

    log.info(`Proxy started on port ${PROXY_PORT}`);
};

export default startProxy;
