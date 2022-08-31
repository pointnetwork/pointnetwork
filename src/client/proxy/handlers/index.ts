import {FastifyInstance} from 'fastify';
import attachCommonHandler from './common';
import attachStorageHandlers from './storage';
import attachApiHandler from './api';
import attachPointApiHandler from './pointApi';

const attachHandlers = (server: FastifyInstance) => {
    attachStorageHandlers(server);
    attachPointApiHandler(server);
    attachApiHandler(server);
    // TODO: deprecated, should be removed
    // attachContractSendHandler(server);
    // attachKeyValueHandlers(server);
    attachCommonHandler(server);
};

export default attachHandlers;
