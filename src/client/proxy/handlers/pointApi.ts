import {FastifyInstance, FastifyRequest} from 'fastify';
import DeployController from '../../../api/controllers/DeployController';
import WalletController from '../../../api/controllers/WalletController';
import {deployUpgradableContracts} from '../../../network/deployer';

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

    server.route({
        method: ['POST'],
        url: '/point_api/deploy_upgradable_contracts',
        handler: async (req, res) => {
            const {host} = req.headers;
            if (host !== 'point') {
                res.status(403).send('Forbidden');
            }

            if (!req.headers['content-type']?.match('multipart/form-data')) {
                return res.status(415).send('Only multipart/form-data is supported');
            }

            const files = [];
            const fields: Record<string, any> = {};
            for await (const part of req.parts()) {
                if (part.file) {
                    files.push(await part.toBuffer());
                } else {
                    fields[part.fieldname] = (part as any).value;
                }
            }

            if (files.length === 0) {
                return res.status(400).send('No files in the body');
            }

            const {
                contractNames,
                version,
                target,
                forceDeployProxy
            } = fields;

            if (!(contractNames && version && target)) {
                return res.status(400).send('No required fields in the body');
            }

            await deployUpgradableContracts({
                contracts: files.map((file, index) => ({
                    file,
                    name: JSON.parse(contractNames)[index]
                })),
                version,
                target,
                forceDeployProxy
            });

            res.status(200).send('Success');
        }
    });
};

export default attachPointApiHandler;
