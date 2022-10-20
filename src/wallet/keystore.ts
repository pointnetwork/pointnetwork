import fs from 'fs';
// TODO: for some reason, just ../util doesn't work
import {resolveHome} from '../util/resolveHome';
import path from 'path';
import config from 'config';
import Wallet, {hdkey} from 'ethereumjs-wallet';
import * as bip39 from 'bip39';
import {mnemonicToSeedSync} from 'bip39';
import {Keypair} from '@solana/web3.js';
import {derivePath} from 'ed25519-hd-key';
import { DirectSecp256k1HdWallet, OfflineSigner } from '@cosmjs/proto-signing';
const keystorePath: string = resolveHome(config.get('wallet.keystore_path'));

// The one used by Phantom Wallet.
// (Solflare uses `m/44'/501'` by default, but shows this one in the advanced options)
const SOLANA_HDWALLET_DERIVATION_PATH = `m/44'/501'/0'/0'`;

function getWalletFactory() {
    let wallet: Wallet | undefined;
    let mnemonic: string;
    return (): {wallet: Wallet; mnemonic: string} => {
        if (!wallet) {
            mnemonic = JSON.parse(
                fs.readFileSync(path.join(keystorePath, 'key.json')).toString()
            ).phrase;
            const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeedSync(mnemonic));
            wallet = hdwallet.getWallet();
        }
        return {wallet, mnemonic};
    };
}

const getWallet = getWalletFactory();

export function getNetworkAddress() {
    return `0x${getWallet()
        .wallet.getAddress()
        .toString('hex')}`;
}

export function getNetworkPublicKey() {
    return getWallet()
        .wallet.getPublicKey()
        .toString('hex');
}

export function getNetworkPrivateKey() {
    return getWallet()
        .wallet.getPrivateKey()
        .toString('hex');
}

export function getMnemonic() {
    return getWallet().mnemonic;
}

export const getSolanaKeyPair = () => {
    const mnemonic = getMnemonic();
    const seed = mnemonicToSeedSync(mnemonic);
    const keypair = Keypair.fromSeed(
        derivePath(SOLANA_HDWALLET_DERIVATION_PATH, seed.toString('hex')).key
    );
    return keypair;
};

export function getCosmosWallet(): Promise<OfflineSigner> {
    return DirectSecp256k1HdWallet.fromMnemonic(getMnemonic());
}

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
