import {getNetworkPublicKey, getNetworkAddress, getSolanaKeyPair} from '../wallet/keystore';
import solana from '../network/providers/solana';
import ethereum from '../network/providers/ethereum';
import {IdentityData, IdentityParams} from './types';
import {identityCache} from './identity-cache';
import logger from '../core/log';
const log = logger.child({module: 'getIdentity'});

const defaultParams: IdentityParams = {
    solAddress: '',
    ethAddress: '',
    targets: [],
    solNetwork: 'solana',
    ethNetwork: 'rinkeby'
};

/**
 * Returns the user identity.
 *
 * Identity can be:
 *   - a Solana (SNS) domain (`.sol`)
 *   - an Ethereum (ENS) domain (`.eth`)
 *   - a Point identity (registered in Point Identity Contract)
 *
 * The priority to choose an identity (should multiple be available) is:
 *   - Point
 *   - SNS
 *   - ENS
 */
export async function getIdentity({
    solAddress,
    ethAddress,
    targets,
    solNetwork,
    ethNetwork
} = defaultParams): Promise<IdentityData> {
    targets = targets || [];
    solNetwork = solNetwork || 'solana';
    ethNetwork = ethNetwork || 'rinkeby';

    if (targets.length === 0 || targets.includes('point')) {
        // Check for `.point` identity.
        const pointPublicKey = getNetworkPublicKey();
        const pointAddress = ethAddress || getNetworkAddress();

        // Look in cache.
        const cacheKey = `point:${pointAddress}`;
        const identity = identityCache.get(cacheKey);

        // Return cached identity only if it is not `null`.
        if (identity && identity.identity) {
            return identity;
        }

        // Fetch idendity from blockchain and cache it. If no identity is found, cache it
        // as `null` so we don't ask again for the same address, until the cache expires.
        if (!identity) {
            try {
                const pointIdentity = await ethereum.identityByOwner(pointAddress);
                if (
                    pointIdentity &&
                    pointIdentity.replace('0x', '').toLowerCase() !==
                        pointAddress.replace('0x', '').toLowerCase()
                ) {
                    const identity: IdentityData = {
                        identity: pointIdentity,
                        address: pointAddress,
                        publicKey: pointPublicKey,
                        network: 'point'
                    };

                    identityCache.add(cacheKey, identity);
                    return identity;
                } else {
                    identityCache.add(cacheKey, {
                        identity: null,
                        address: pointAddress,
                        publicKey: pointPublicKey,
                        network: 'point'
                    });
                }
            } catch {
                return {
                    identity: null,
                    address: pointAddress,
                    publicKey: pointPublicKey,
                    network: 'point'
                };
            }
        }
    }

    if (targets.length === 0 || targets.includes('solana')) {
        try {
            const solanaPublicKey = solAddress
                ? solana.toPublicKey(solAddress)
                : getSolanaKeyPair().publicKey;

            // Look in cache.
            const cacheKey = `sol:${solanaPublicKey.toString()}`;
            const identity = identityCache.get(cacheKey);

            // Return cached identity only if it is not `null`.
            if (identity && identity.identity) {
                return identity;
            }

            // Fetch idendity from blockchain and cache it. If no identity is found, cache it
            // as `null` so we don't ask again for the same address, until the cache expires.
            if (!identity) {
                const solDomain = await solana.getDomain(solanaPublicKey, solNetwork);
                if (solDomain) {
                    const identity: IdentityData = {
                        identity: solDomain,
                        address: solanaPublicKey.toString(),
                        publicKey: solanaPublicKey.toString(),
                        network: 'solana'
                    };

                    identityCache.add(cacheKey, identity);
                    return identity;
                } else {
                    identityCache.add(cacheKey, {
                        identity: null,
                        address: solanaPublicKey.toString(),
                        publicKey: solanaPublicKey.toString(),
                        network: 'solana'
                    });
                }
            }
        } catch (error) {
            log.error(`Error when trying to get identity for solana`);
        }

        // Check for `.sol` identity.

    }

    if (targets.length === 0 || targets.includes('ethereum')) {

        try {
            // Check for `.eth` identity.
            const ethereumPublicKey = getNetworkPublicKey();
            const ethereumAddress = ethAddress || getNetworkAddress();

            // Look in cache.
            const cacheKey = `eth:${ethereumAddress}`;
            const identity = identityCache.get(cacheKey);

            // Return cached identity only if it is not `null`.
            if (identity && identity.identity) {
                return identity;
            }

            // Fetch idendity from blockchain and cache it. If no identity is found, cache it
            // as `null` so we don't ask again for the same address, until the cache expires.
            if (!identity) {
                const ethDomain = await ethereum.getDomain(ethereumAddress, ethNetwork);
                if (ethDomain) {
                    const identity: IdentityData = {
                        identity: ethDomain,
                        address: ethereumAddress,
                        publicKey: ethereumPublicKey,
                        network: 'ethereum'
                    };

                    identityCache.add(cacheKey, identity);
                    return identity;
                } else {
                    identityCache.add(cacheKey, {
                        identity: null,
                        address: ethereumAddress,
                        publicKey: ethereumPublicKey,
                        network: 'ethereum'
                    });
                }
            }
        } catch (error) {
            log.error(`Error when trying to get identity for network ${ethNetwork}`);
        }

    }

    // Return empty identity when one is not found anywhere.
    return {
        identity: null,
        address: getNetworkAddress(),
        publicKey: getNetworkPublicKey(),
        network: 'point'
    };
}

module.exports = {getIdentity};
