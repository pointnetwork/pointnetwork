import * as web3 from '@solana/web3.js';
import {mnemonicToSeedSync} from 'bip39';
import {getSecretPhrase} from '../../wallet/keystore';
import config from 'config';
import axios from 'axios';
const logger = require('../../core/log');
const log = logger.child({module: 'SolanaProvider'});

const createSolanaConnection = (blockchainUrl: string) => {
    const connection = new web3.Connection(
        blockchainUrl,
        'confirmed'
    );

    log.debug({blockchainUrl}, 'Created solana instance');
    return connection;
};

const createSolanaWallet = () => {
    const seed = mnemonicToSeedSync(getSecretPhrase());
    return web3.Keypair.fromSeed(Uint8Array.from(seed.toJSON().data.slice(0, 32)));
    // return web3.Keypair.fromSeed(fromSeed(seed).derivePath(`m/44'/501'/0'/0`).privateKey);
};

const networks: Record<string, {type: string; address: string}> = config.get('network.web3');
const providers: Record<string, {connection: web3.Connection; wallet: web3.Keypair}> =
    Object.keys(networks)
        .filter(key => networks[key].type === 'solana')
        .reduce(
            (acc, cur) => ({
                ...acc,
                [cur]: {
                    connection: createSolanaConnection(networks[cur].address),
                    wallet: createSolanaWallet()
                }
            }),
            {}
        );

const solana = {
    sendTransaction: () => {
        // TODO
    },
    simulateTransaction: () => {
        // TODO
    },
    requestAirdrop: () => {
        // TODO
    },
    send: async ({method, params = [], id = new Date().getTime(), network}: {
        method: string,
        params?: unknown[],
        id?: number,
        network: string
    }) => {
        const blockchainUrl = networks[network];
        if (!blockchainUrl) {
            throw new Error(`Unknown network ${network}`);
        }
        if (blockchainUrl.type !== 'solana') {
            throw new Error(`Wrong network type for ${network}, solana expected`);
        }
        const res = await axios.post(
            blockchainUrl.address,
            {method, params, id, jsonrpc: '2.0'},
            {validateStatus: () => true}
        );
        if (res.status !== 200) {
            throw new Error(
                `RPC call failed with status ${res.status}: ${JSON.stringify(res.data)}`
            );
        }
        return res.data;
    }
};

export default solana;
