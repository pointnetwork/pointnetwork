import {FastifyInstance} from 'fastify';
import attachCommonHandler from './common';
import attachStorageHandlers from './storage';
import attachKeyValueHanlders from './keyValue';
import attachContractSendHandler from './contractSend';
import attachApiHandler from './api';
import attachWebsocketHanlders from './websocket';


// TODO: ctx is needed for Renderer and keyvalue, remove it later
const attachHandlers = (server: FastifyInstance, ctx: any) => {
    attachStorageHandlers(server);
    attachApiHandler(server);
    attachContractSendHandler(server);
    attachKeyValueHanlders(server);
    attachCommonHandler(server, ctx);
    attachWebsocketHanlders(server, ctx);
};

export default attachHandlers;
