import {FastifyInstance, FastifyRequest} from 'fastify';
import WalletController from '../../../api/controllers/WalletController';

const attachPointApiHandler = (server: FastifyInstance) => {
    server.route({
        method: ['GET', 'POST'],
        url: '/point_api/wallet/:method',
        handler: async (req: FastifyRequest<{ Params: {'method': string}; }>, res) => {
            const controller = new WalletController(req, res);

            return controller[req.params.method as 'send']();
        }
    });
};

export default attachPointApiHandler;
