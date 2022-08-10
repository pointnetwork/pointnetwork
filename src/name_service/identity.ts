import {getNetworkPublicKey, getNetworkAddress, getSolanaKeyPair} from '../wallet/keystore';
import solana from '../network/providers/solana';
import ethereum from '../network/providers/ethereum';
import {IdentityData, IdentityParams} from './types';
import {identityCache} from './identity-cache';

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
        if (identity) {
            return identity;
        }

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

    if (targets.length === 0 || targets.includes('solana')) {
        // Check for `.sol` identity.
        const solanaPublicKey = solAddress
            ? solana.toPublicKey(solAddress)
            : getSolanaKeyPair().publicKey;

        // Look in cache.
        const cacheKey = `sol:${solanaPublicKey.toString()}`;
        const identity = identityCache.get(cacheKey);
        if (identity) {
            return identity;
        }

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

    if (targets.length === 0 || targets.includes('ethereum')) {
        // Check for `.eth` identity.
        const ethereumPublicKey = getNetworkPublicKey();
        const ethereumAddress = ethAddress || getNetworkAddress();

        // Look in cache.
        const cacheKey = `eth:${ethereumAddress}`;
        const identity = identityCache.get(cacheKey);
        if (identity) {
            return identity;
        }

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

    return {
        identity: null,
        address: getNetworkAddress(),
        publicKey: getNetworkPublicKey(),
        network: 'point'
    };
}

module.exports = {getIdentity};
