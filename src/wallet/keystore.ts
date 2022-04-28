// TODO: for some reason, just ../util doesn't work
import fs from 'fs';
import {resolveHome} from '../util/resolveHome';
import path from 'path';
import config from 'config';
import Wallet, {hdkey} from 'ethereumjs-wallet';
import Arweave from 'arweave';
import * as bip39 from 'bip39';
import {JWKInterface} from 'arweave/node/lib/wallet';

const arweave = Arweave.init({});

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

function getArweaveKeyFactory() {
    let arweaveKey: string | undefined;
    return (): JWKInterface | undefined => {
        if (!arweaveKey) {
            try {
                arweaveKey = require(path.join(keystorePath, 'arweave.json'));
            } catch (e){
                arweaveKey = undefined;
            }
        }
        return arweaveKey as JWKInterface | undefined;
    };
}

const getWallet = getWalletFactory();
const getArweaveKey = getArweaveKeyFactory();

export function getNetworkAddress() {
    return `0x${getWallet().wallet.getAddress().toString('hex')}`;
}

export function getNetworkPublicKey() {
    return getWallet().wallet.getPublicKey().toString('hex');
}

export function getNetworkPrivateKey() {
    return getWallet().wallet.getPrivateKey().toString('hex');
}

export function getStroragePrivateKey() {
    return getArweaveKey();
}

export function getStorageAddress() {
    return arweave.wallets.jwkToAddress(getArweaveKey());
}

export function getSecretPhrase() {
    return getWallet().secretPhrase;
}
