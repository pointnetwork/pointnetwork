import fs from 'fs';
// TODO: for some reason, just ../util doesn't work
import {resolveHome} from '../util/resolveHome';
import path from 'path';
import config from 'config';
import Wallet, {hdkey} from 'ethereumjs-wallet';
import * as bip39 from 'bip39';
import {mnemonicToSeedSync} from 'bip39';
import {Keypair} from '@solana/web3.js';

const keystorePath: string = resolveHome(config.get('wallet.keystore_path'));

function getWalletFactory() {
    let wallet: Wallet | undefined;
    let secretPhrase: string;
    return (): { wallet: Wallet, secretPhrase: string } => {
        if (!wallet) {
            secretPhrase = JSON.parse(fs.readFileSync(path.join(keystorePath, 'key.json')).toString()).phrase;
            const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeedSync(secretPhrase));
            wallet = hdwallet.getWallet();
        }
        return {wallet, secretPhrase};
    };
}

const getWallet = getWalletFactory();

export function getNetworkAddress() {
    return `0x${getWallet().wallet.getAddress().toString('hex')}`;
}

export function getNetworkPublicKey() {
    return getWallet().wallet.getPublicKey().toString('hex');
}

export function getNetworkPrivateKey() {
    return getWallet().wallet.getPrivateKey().toString('hex');
}

export function getSecretPhrase() {
    return getWallet().secretPhrase;
}

export const getSolanaKeyPair = () => {
    const seed = mnemonicToSeedSync(getSecretPhrase());
    return Keypair.fromSeed(Uint8Array.from(seed.toJSON().data.slice(0, 32)));
};

// TODO: restore if needed
// function getArweaveKeyFactory() {
//     let arweaveKey: string | undefined;
//     return (): JWKInterface | undefined => {
//         if (!arweaveKey) {
//             try {
//                 arweaveKey = require(path.join(keystorePath, 'arweave.json'));
//             } catch (e){
//                 arweaveKey = undefined;
//             }
//         }
//         return arweaveKey as JWKInterface | undefined;
//     };
// }

// const getArweaveKey = getArweaveKeyFactory();

// export function getStoragePrivateKey() {
//     return getArweaveKey();
// }
//
// export function getStorageAddress() {
//     return arweave.wallets.jwkToAddress(getArweaveKey());
// }
