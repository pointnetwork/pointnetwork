/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * truffleframework.com/docs/advanced/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like truffle-hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura accounts
 * are available for free at: infura.io/register.
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 */

// const HDWalletProvider = require('truffle-hdwallet-provider');
// const infuraKey = "fj4jll3k.....";
//
// const fs = require('fs');
// const mnemonic = fs.readFileSync(".secret").toString().trim();

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
