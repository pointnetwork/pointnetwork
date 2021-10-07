const {
    BLOCKCHAIN_HOST = 'localhost',
    BLOCKCHAIN_PORT = 9090,
    BLOCKCHAIN_PATH,
} = process.env;

const build_path = process.env.DEPLOYER_BUILD_PATH || './build/contracts';
const compiler_version = process.env.DEPLOYER_COMPILER_VERSION || '0.8.7';

const Web3 = require("web3");
const HDWalletProvider = require("@truffle/hdwallet-provider");

const privateKey = process.env.DEPLOYER_KEY;
const provider = new Web3.providers.HttpProvider(
    `http://${BLOCKCHAIN_HOST}:${BLOCKCHAIN_PORT}${BLOCKCHAIN_PATH ? `/${BLOCKCHAIN_PATH}` : ``}`
);

module.exports = {
    contracts_build_directory: build_path,
    networks: {
        znet: {
            provider: () => new HDWalletProvider(privateKey, provider),
            from: process.env.DEPLOYER_ADDRESS,
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
