import fs from 'fs';
// TODO: for some reason, just ../util doesn't work
import {resolveHome} from '../util/resolveHome.js';
import path from 'path';
import config from 'config';
// import Wallet, {hdkey} from 'ethereumjs-wallet';
import Wallet from 'ethereumjs-wallet/dist/index.js';
import hdkey from 'ethereumjs-wallet/dist/hdkey.js';
import * as bip39 from 'bip39';
import {mnemonicToSeedSync} from 'bip39';
import {Keypair} from '@solana/web3.js';
import {derivePath} from 'ed25519-hd-key';
import {hashFn} from '../util/hashFn.js';

const keystorePath: string = resolveHome(config.get('wallet.keystore_path'));

// The one used by Phantom Wallet.
// (Solflare uses `m/44'/501'` by default, but shows this one in the advanced options)
const SOLANA_HDWALLET_DERIVATION_PATH = `m/44'/501'/0'/0'`;
const POINT_ENCRYPTION_ROOT_DERIVATION_PATH = `m/10687'/0'/0'/0'`;

function getWalletFactory() {
    let wallet: Wallet | undefined;
    let secretPhrase: string;
    return (): {wallet: Wallet; secretPhrase: string} => {
        if (!wallet) {
            secretPhrase = JSON.parse(
                fs.readFileSync(path.join(keystorePath, 'key.json')).toString()
            ).phrase;
            const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeedSync(secretPhrase));
            wallet = hdwallet.getWallet();
        }
        return {wallet, secretPhrase};
    };
}

const getWallet = getWalletFactory();

export function getNetworkAddress() {
    return getWallet().wallet.getChecksumAddressString();
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

export function getNetworkPrivateSubKey(path: string): string {
    const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeedSync(getSecretPhrase()));
    const wallet = hdwallet.derivePath(POINT_ENCRYPTION_ROOT_DERIVATION_PATH).getWallet();
    const rootKeyForSubKeys = wallet.getPrivateKey();

    // make sure the rootKey is not accidentally something silly like 0x0
    if (rootKeyForSubKeys.equals(Buffer.alloc(32)) || rootKeyForSubKeys.byteLength !== 32) {
        throw new Error('rootKeyForSubKeys is empty or invalid length');
    }

    // now from here we can derive subkeys
    const pathHash = hashFn(Buffer.from(path, 'utf8'));

    // let's turn the hash into an array of bytes and then of BIP32 indexes
    const indexes = [];
    for (let i = 0; i < pathHash.length; i += 4) {
        // hardened is 0x80000000. in that case, add a ' to the end of the index
        const index = pathHash.readUInt32BE(i);
        if (index >= 0x80000000) {
            indexes.push(`${index - 0x80000000}'`);
        } else {
            indexes.push(index);
        }
    }
    // collect the indexes into a string
    const newDerivationPath = `m/0'/${indexes.join('/')}`;

    const hdwallet2 = hdkey.fromMasterSeed(rootKeyForSubKeys);
    const wallet2 = hdwallet2.derivePath(newDerivationPath).getWallet();
    const result = wallet2.getPrivateKey().toString('hex');

    return result;
}

export function getSecretPhrase() {
    return getWallet().secretPhrase;
}

export const getSolanaKeyPair = () => {
    const phrase = getSecretPhrase();
    const seed = mnemonicToSeedSync(phrase);
    const keypair = Keypair.fromSeed(
        derivePath(SOLANA_HDWALLET_DERIVATION_PATH, seed.toString('hex')).key
    );
    return keypair;
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
