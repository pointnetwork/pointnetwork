import config from 'config';
import ethereum from '../network/providers/ethereum';
import {getNetworkAddress, getSecretPhrase} from './keystore';
import solana from '../network/providers/solana';
import {Keypair, LAMPORTS_PER_SOL} from '@solana/web3.js';
import {mnemonicToSeedSync} from 'bip39';

const networks: Record<string, {type: string; address: string}> = config.get('network.web3');

export const sendTransaction = async ({
    to,
    network = 'ynet',
    value
}: {
    from: string;
    to: string;
    network?: string;
    value: string;
}) => {
    if (!networks[network]) {
        throw new Error(`Unknown network ${network}`);
    }

    switch (networks[network].type) {
        case 'eth':
            return ethereum.send({
                method: 'eth_sendTransaction',
                params: [{
                    from: ethereum.getOwner(),
                    to,
                    value
                }],
                id: new Date().getTime(),
                network
            });
        case 'solana':
            return solana.sendFunds({to, network, lamports: Number(value)});
        default:
            throw new Error(
                `Bad config: unexpected network ${network} type ${networks[network].type}`
            );
    }
};

export const getBalance = async ({network = 'ynet', majorUnits = false}) => {
    if (!networks[network]) {
        throw new Error(`Unknown network ${network}`);
    }

    switch (networks[network].type) {
        case 'eth':
            const balanceInWei = await ethereum.getBalance({
                address: getNetworkAddress(),
                network
            });
            return majorUnits ? balanceInWei / 1e18 : balanceInWei;
        case 'solana':
            const balanceInLamports = await solana.getBalance(network);
            return majorUnits ? balanceInLamports / LAMPORTS_PER_SOL : balanceInLamports;
        default:
            throw new Error(
                `Bad config: unexpected network ${network} type ${networks[network].type}`
            );
    }
};

export const getTransactions = async ({network = 'ynet'}) => {
    if (!networks[network]) {
        throw new Error(`Unknown network ${network}`);
    }

    switch (networks[network].type) {
        case 'eth':
            return ethereum.getTransactionsByAccount({
                account: getNetworkAddress(),
                network
            });
        case 'solana':

            // TODO: avoid using secret phrase here
            const seed = mnemonicToSeedSync(getSecretPhrase());
            const keypair = Keypair
                .fromSeed(Uint8Array.from(seed.toJSON().data.slice(0, 32)));

            return solana.getSignaturesForAddress({
                address: keypair.publicKey.toString(),
                network
            });
        default:
            throw new Error(
                `Bad config: unexpected network ${network} type ${networks[network].type}`
            );
    }
};
