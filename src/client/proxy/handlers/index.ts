import {FastifyInstance} from 'fastify';
import attachCommonHandler from './common';
import attachStorageHandlers from './storage';

// TODO: ctx is needed for Renderer, remove it later
const attachHandlers = (server: FastifyInstance, ctx: any) => {
    attachStorageHandlers(server);
    attachCommonHandler(server, ctx);
};

export default attachHandlers;
