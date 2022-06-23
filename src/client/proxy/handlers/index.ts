import {FastifyInstance} from 'fastify';
import attachCommonHandler from './common';
import attachStorageHandlers from './storage';
import attachKeyValueHanlders from './keyValue';
import attachContractSendHandler from './contractSend';
import attachApiHandler from './api';
import attachPointApiHandler from './pointApi';

// TODO: ctx is needed for Renderer and keyvalue, remove it later
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const attachHandlers = (server: FastifyInstance, ctx: any) => {
    attachStorageHandlers(server);
    attachPointApiHandler(server);
    attachApiHandler(server);
    attachContractSendHandler(server);
    attachKeyValueHanlders(server);
    attachCommonHandler(server, ctx);
};

export default attachHandlers;
