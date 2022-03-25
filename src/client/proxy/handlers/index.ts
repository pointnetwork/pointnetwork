import {FastifyInstance} from 'fastify';
import attachCommonHandler from './common';
import attachStorageHandlers from './storage';
import attachKeyValueHanlders from './keyValue';

// TODO: ctx is needed for Renderer, remove it later
const attachHandlers = (server: FastifyInstance, ctx: any) => {
    attachStorageHandlers(server);
    attachKeyValueHanlders(server, ctx);
    attachCommonHandler(server, ctx);
};

export default attachHandlers;
