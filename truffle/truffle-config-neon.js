const host = process.env.BLOCKCHAIN_HOST || '127.0.0.1';
const port = process.env.BLOCKCHAIN_PORT || 9090;
const build_path = process.env.BUILD_PATH || './build/contracts';
const compiler_version = process.env.COMPILER_VERSION || '0.8.7';

const Web3 = require("web3");
const HDWalletProvider = require("@truffle/hdwallet-provider");

const provider = new Web3.providers.HttpProvider(`http://${host}:${port}/solana`);
const privateKey = process.env.CONTRACT_DEPLOYER_KEY;

module.exports = {
    contracts_build_directory: build_path,
    networks: {
        solana: {
            provider: () => new HDWalletProvider(privateKey, provider),
            from: process.env.CONTRACT_DEPLOYER_ADDRESS,
            network_id: '*',
            gas: 3000000,
            gasPrice: 1000000000,
        }
    },

    mocha: {
        // timeout: 100000
    },

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
                },
            },
        },
    },
};
