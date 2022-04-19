import {FastifyInstance, FastifyRequest} from 'fastify';
import ZProxySocketController from '../../../api/sockets/ZProxySocketController';
import {SocketStream} from 'fastify-websocket';

const attachWebsocketHanlders = (server: FastifyInstance, ctx: any) => {
    server.get('/',  {websocket: true}, ({socket}: SocketStream, {hostname}: FastifyRequest) => (
        void new ZProxySocketController(ctx, socket, server.websocketServer, hostname)
    ));
};

export default attachWebsocketHanlders;
