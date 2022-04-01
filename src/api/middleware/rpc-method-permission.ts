import {FastifyReply, FastifyRequest} from 'fastify';
import {RPCRequestBody} from '../controllers/BlockchainController';
import blockchain from '../../network/blockchain';
import permissionStore from '../../permissions/PermissionStore';

const RESTRICTED_METHODS = ['eth_sendTransaction'];

async function methodPermissionMdw(req: FastifyRequest, reply: FastifyReply) {
    const {method} = req.body as RPCRequestBody;

    if (RESTRICTED_METHODS.includes(method)) {
        const dappDomain = req.headers.origin;
        if (!dappDomain) {
            reply.status(400).send({
                code: 400,
                message: '`Origin` header is required.'
            });
            return reply;
        }

        const address = blockchain.getOwner();
        const permissions = await permissionStore.get(dappDomain, address);
        if (!permissions || !permissions.parentCapabilities.includes(method)) {
            reply.status(401).send({
                code: 4100,
                name: 'Unauthorized',
                message: `Permission for method "${method}" has not been granted.`
            });
            return reply;
        }
    }
}

// Need to keep it like this because of the way it's imported.
module.exports = methodPermissionMdw;
