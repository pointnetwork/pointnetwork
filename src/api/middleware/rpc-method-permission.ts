import {FastifyReply, FastifyRequest} from 'fastify';
import {RPCRequest} from '../../rpc/rpc-handlers';
import * as blockchain from '../../network/providers/ethereum';
import permissionStore from '../../permissions/PermissionStore';

const RESTRICTED_METHODS = [''];

async function methodPermissionMdw(req: FastifyRequest, reply: FastifyReply) {
    if (req.body) {
        const {method} = req.body as RPCRequest;

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
}

export default methodPermissionMdw;
