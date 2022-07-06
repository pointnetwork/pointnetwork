import {FastifyInstance} from 'fastify';
import attachCommonHandler from './common';
import attachStorageHandlers from './storage';
import attachKeyValueHandlers from './keyValue';
import attachContractSendHandler from './contractSend';
import attachApiHandler from './api';
import attachPointApiHandler from './pointApi';

const attachHandlers = (server: FastifyInstance) => {
    attachStorageHandlers(server);
    attachPointApiHandler(server);
    attachApiHandler(server);
    attachContractSendHandler(server);
    attachKeyValueHandlers(server);
    attachCommonHandler(server);
};

export default attachHandlers;
