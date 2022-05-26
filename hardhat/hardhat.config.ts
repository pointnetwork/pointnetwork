import * as dotenv from 'dotenv';
import {HardhatUserConfig, task} from 'hardhat/config';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import '@openzeppelin/hardhat-upgrades';
import './tasks/importer/identity';
import './tasks/importer/blog';
import './tasks/importer/pointSocial';
import './tasks/importer/sms';
import './tasks/importer/identity-clone';
import './tasks/identity/identity-update-contract';
import './tasks/identity/identity-add-deployer.ts';
import './tasks/identity/identity-remove-deployer.ts';
import './tasks/identity/identity-list-deployers.ts';
import './tasks/explorer/explorer-set-index-md';
import {NetworkUserConfig} from 'hardhat/types';

const isDevelopment = process.env.MODE === 'e2e' || process.env.MODE === 'zappdev';

dotenv.config();

let ynetPrivateKey = process.env.DEPLOYER_ACCOUNT;
if (ynetPrivateKey == undefined) {
    const homedir = require('os').homedir();
    require('path').resolve(homedir, '.point', 'keystore', 'key.json');
    const wallet = require('ethereumjs-wallet')
        .hdkey.fromMasterSeed(
            require('bip39').mnemonicToSeedSync(
                require(require('path').resolve(homedir, '.point', 'keystore', 'key.json')).phrase
            )
        )
        .getWallet();
    ynetPrivateKey = wallet.getPrivateKey().toString('hex');
}

if (ynetPrivateKey == undefined) {
    throw new Error('ynetPrivateKey is not set.');
}

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});

const privateKey =
    process.env.DEPLOYER_ACCOUNT ||
    '0x011967d88c6b79116bb879d4c2bc2c3caa23569edd85dfe0bc596846837bbc8e';
const host = process.env.BLOCKCHAIN_HOST || 'blockchain_node';
const port = process.env.BLOCKCHAIN_PORT || 7545;
const build_path = process.env.DEPLOYER_BUILD_PATH || './build';

const devaddress = 'http://' + host + ':' + port;
console.log(devaddress);

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const networks: Record<string, NetworkUserConfig> = {
    development: {
        url: devaddress,
        accounts: [privateKey]
    }
};

if (!isDevelopment) {
    networks.ynet = {
        url: 'http://ynet.point.space:44444',
        accounts: [ynetPrivateKey]
    };
}

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: '0.8.0',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 1000
                    }
                }
            },
            {
                version: '0.8.4',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 1000
                    }
                }
            },
            {
                version: '0.8.7',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 1000
                    }
                }
            }
        ]
    },
    paths: {
        artifacts: build_path
    },
    networks
};

export default config;
