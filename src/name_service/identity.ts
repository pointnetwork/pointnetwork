import {getNetworkPublicKey, getNetworkAddress, getSolanaKeyPair} from '../wallet/keystore';
import solana from '../network/providers/solana';
import ethereum from '../network/providers/ethereum';

type IdentityData = {
    identity: string | null;
    address: string;
    publicKey: string;
    network: 'point' | 'solana' | 'ethereum';
};

type IdentityParams = {
    solAddress?: string;
    ethAddress?: string;
    targets?: string[];
    solNetwork?: string;
    ethNetwork?: string;
};

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
        try {
            const pointIdentity = await ethereum.identityByOwner(pointAddress);
            if (
                pointIdentity &&
                pointIdentity.replace('0x', '').toLowerCase() !==
                    pointAddress.replace('0x', '').toLowerCase()
            ) {
                return {
                    identity: pointIdentity,
                    address: pointAddress,
                    publicKey: pointPublicKey,
                    network: 'point'
                };
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

        const solDomain = await solana.getDomain(solanaPublicKey, solNetwork);
        if (solDomain) {
            return {
                identity: solDomain,
                address: solanaPublicKey.toString(),
                publicKey: solanaPublicKey.toString(),
                network: 'solana'
            };
        }
    }

    if (targets.length === 0 || targets.includes('ethereum')) {
        // Check for `.eth` identity.
        const ethereumPublicKey = getNetworkPublicKey();
        const ethereumAddress = ethAddress || getNetworkAddress();
        const ethDomain = await ethereum.getDomain(ethereumAddress, ethNetwork);
        if (ethDomain) {
            return {
                identity: ethDomain,
                address: ethereumAddress,
                publicKey: ethereumPublicKey,
                network: 'ethereum'
            };
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
