import {getContractAddress} from '../util/contract';

export function patchConfig(datadir = '') {
    if (datadir) {
        process.env.DATADIR = datadir;
    }

    if (process.env.MODE === 'e2e' || process.env.MODE === 'zappdev') {
        const identityContractAddress = getContractAddress('Identity');

        if (!identityContractAddress) {
            throw new Error('Could not get Identity contract address');
        }
        process.env.IDENTITY_CONTRACT_ADDRESS = identityContractAddress;
    }
}
