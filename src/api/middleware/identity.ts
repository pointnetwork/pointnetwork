import {FastifyRequest} from 'fastify';
import ethereum from '../../network/providers/ethereum';
import solana from '../../network/providers/solana';
import {parseDomainRegistry} from '../../name_service/registry';

type EnhancedFastifyRequest = FastifyRequest & {identity?: string};

const SUPPORTED_NAME_SERVICE_TLDS = ['.eth', '.sol'];

/**
 * Store the identity in the request object.
 * If the host is not a .point domain (ie: .eth or .sol), lookup the Point identity.
 */
async function identityMdw(req: EnhancedFastifyRequest) {
    const tld = SUPPORTED_NAME_SERVICE_TLDS.find(tld => req.headers.host?.endsWith(tld));
    if (tld === '.eth') {
        const registry = await ethereum.resolveDomain(req.hostname);
        const {identity} = parseDomainRegistry(registry);
        req.identity = identity;
    } else if (tld === '.sol') {
        const registry = await solana.resolveDomain(req.hostname);
        const {identity} = parseDomainRegistry(registry);
        req.identity = identity;
    } else {
        // Default to using the host as the identity.
        req.identity = req.headers.host || req.hostname;
    }
}

export default identityMdw;

// To facilitate imports in JS files (src/api/index.js)
module.exports = identityMdw;
