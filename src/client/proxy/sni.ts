import tls, {SecureContext} from 'tls';
import {getCertificate} from './certificates';
import logger from '../../core/log';

const log = logger.child({module: 'SNICallback'});

const SNICallback = (servername: string, cb: (err: Error | null, ctx?: SecureContext) => void) => {
    const certData = getCertificate(servername);
    const secureContext = tls.createSecureContext(certData);

    log.warn({servername, certData, secureContext}, 'Sni');

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

export default SNICallback;
