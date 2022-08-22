import {FastifyInstance, FastifyRequest} from 'fastify';
import DeployController from '../../../api/controllers/DeployController';
import WalletController from '../../../api/controllers/WalletController';

const attachPointApiHandler = (server: FastifyInstance) => {
    server.route({
        method: ['GET', 'POST'],
        url: '/point_api/wallet/:method',
        handler: async (req: FastifyRequest<{Params: {method: string}}>, res) => {
            const controller = new WalletController(req, res);

            return controller[req.params.method as 'send']();
        }
    });

    server.route({
        method: ['POST'],
        url: '/point_api/deploy',
        handler: async (req, res) => {
            const {host} = req.headers;
            if (host !== 'point') {
                res.status(403).send('Forbidden');
            }
    
            const controller = new DeployController(req);
    
            const {status, error} = await controller.deploy();
    
            res.status(status === 'success'
                ? 200
                : error === 'deploy path not specified'
                    ? 400
                    : 500).send({
                status,
                error
            });
        }
    });
};

export default attachPointApiHandler;
