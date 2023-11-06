import {FastifyInstance} from 'fastify';
import attachCommonHandler from './common';
import attachStorageHandlers from './storage';
import attachApiHandler from './api';
import attachPointApiHandler from './pointApi';
import config from 'config';
import attachEncryptedStorageHandlers from './encryptedStorage';

const IS_GATEWAY = config.get('mode') === 'gateway';

const attachHandlers = (server: FastifyInstance) => {
    if (!IS_GATEWAY) {
        attachEncryptedStorageHandlers(server);
        attachPointApiHandler(server);
    }
    attachStorageHandlers(server);
    attachApiHandler(server);
    attachCommonHandler(server);
};

export default attachHandlers;
