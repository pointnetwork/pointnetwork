import https from 'https';
import {getCertificate} from './certificates';
import tls from 'tls';
import logger from '../../core/log';
import fs from 'fs';
import path from 'path';
import express from 'express';
import multer from 'multer';

const app = express();
const upload = multer();
const log = logger.child({module: 'Proxy'});
// const httpsServer = Fastify({
//     serverFactory(handler) {
//         const server = https.createServer(
//             {
//                 keepAlive: true,
//                 SNICallback: (servername, cb) => {
//                     const certData = getCertificate(servername);
//                     const secureContext = tls.createSecureContext(certData);

//                     if (!secureContext) {
//                         log.debug({servername}, `Not found SSL certificate for host`);
//                     } else {
//                         log.trace({servername}, `SSL certificate has been found and assigned`);
//                     }

//                     if (typeof cb !== 'function') {
//                         return secureContext;
//                     }

//                     cb(null, secureContext);
//                 }
//             },
//             handler
//         );

//         server.on('error', e => log.error(e, 'HTTPS server error:'));

//         return server;
//     },
//     trustProxy: '127.0.0.1',
//     logger: log
// });
// httpsServer.register(fastifyUrlData);
// httpsServer.register(fastifyMultipart, {
//     onFile: (fieldname, file, filename) => {
//         log.warn({fieldname, filename}, 'File received');
//         file.on('error', (e) => log.error(e, 'File error'));
//     }
// });
// httpsServer.register(fastifyFormBody);
// httpsServer.register(fastifyWs);

app.get('/', (_, res) => {
    log.warn({path: path.resolve(__dirname, 'form.js')}, 'Path');
    res.status(200).send(`<!DOCTYPE html><html><head><title>Uploader test</title><script>${
        fs.readFileSync(path.resolve(__dirname, 'form.js'), 'utf8')
    }</script></head><body></body></html>`);
});

app.post('/', upload.single('file'), (req, res) => {
    log.warn({file: req.file !== undefined}, `Your file's uploaded mate`);
    res.status(200).send({success: true});
});

const SNICallback = (
    servername: string,
    cb: (err: Error | null, ctx?: tls.SecureContext) => void
) => {
    const certData = getCertificate(servername);
    const secureContext = tls.createSecureContext(certData);

    if (!secureContext) {
        log.debug({servername}, `Not found SSL certificate for host`);
    } else {
        log.trace({servername}, `SSL certificate has been found and assigned`);
    }

    if (typeof cb !== 'function') {
        return secureContext;
    }

    cb(null, secureContext);
};

export const httpsServer = new https.Server({SNICallback, keepAlive: true}, app);

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
httpsServer.app = app;

export default httpsServer;
