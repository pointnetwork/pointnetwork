import {FastifyInstance} from 'fastify';
import attachCommonHandler from './common.js';
import attachStorageHandlers from './storage.js';
import attachApiHandler from './api.js';
import attachPointApiHandler from './pointApi.js';
import config from 'config';
import attachEncryptedStorageHandlers from './encryptedStorage.js';

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
