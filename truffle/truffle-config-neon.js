const keystore = require('/.keystore/key.json');

if (typeof keystore !== 'object') {
    throw new Error('Please provide a valid kstore');
}

const keystorePassword = process.env.BLOCKCHAIN_KEYSTORE_PASSWORD || '';
const build_path = process.env.DEPLOYER_BUILD_PATH || './build/contracts';
const compiler_version = process.env.DEPLOYER_COMPILER_VERSION || '0.8.7';

const Web3 = require('web3');
const HDWalletProvider = require('@truffle/hdwallet-provider');

const {address, privateKey} = new Web3().eth.accounts.decrypt(keystore, keystorePassword);
const provider = new Web3.providers.HttpProvider(process.env.BLOCKCHAIN_URL);

module.exports = {
    contracts_build_directory: build_path,
    networks: {
        znet: {
            provider: () => new HDWalletProvider(privateKey, provider),
            from: address,
            network_id: '*',
            gas: 3000000,
            gasPrice: 1000000000
        }
    },

    mocha: {},

    // Configure your compilers
    compilers: {
        solc: {
            // https://www.trufflesuite.com/docs/truffle/reference/configuration#solc
            // https://github.com/trufflesuite/truffle/releases/tag/v5.0.0-beta.0#specify-a-solcjs-version
            version: compiler_version,
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200
                }
            }
        }
    }
};
