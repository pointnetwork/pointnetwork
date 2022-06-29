import config from 'config';
import {ChainId} from './provider';

/**
 * Looks for network settings in config file by chain id.
 * It throws if no network is found.
 */
export function getNetworkConfig(chainId: ChainId): Record<string, string|number|boolean> {
    const networks: Record<string, {[k: string]: string|number|boolean}> = config.get('network.web3');
    const network = Object.values(networks).find(n => n.chain_id === chainId);

    if (!network) {
        throw new Error(`No config found for network with chain_id === ${chainId}`);
    }

    return network;
}
