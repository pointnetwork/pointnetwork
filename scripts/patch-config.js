#!/usr/bin/env node

const {existsSync, writeFileSync, unlinkSync, mkdirSync, readFileSync} = require('fs');
const {execSync} = require('child_process');
const path = require('path');
const Web3 = require('web3');
const HDWalletProvider = require("@truffle/hdwallet-provider");
const Deployer = require('../client/zweb/deployer');
const contractAddresses = {
    Identity: process.env.CONTRACT_ADDRESS_IDENTITY,
    Migrations: process.env.CONTRACT_ADDRESS_MIGRATIONS,
    StorageProviderRegistry: process.env.CONTRACT_ADDRESS_STORAGE_PROVIDER_REGISTRY,
};

function updateConfig() {
    const config = require('/app/resources/znet.json');
    const {
        BLOCKCHAIN_URL = 'http://localhost:9090/solana',
        BLOCKCHAIN_NETWORK_ID,
    } = process.env;

    config.network = {
        ...config.network,
        web3: BLOCKCHAIN_URL,
        web3_network_id: BLOCKCHAIN_NETWORK_ID || undefined,
        communication_external_host: process.env.POINT_NODE_PUBLIC_HOSTNAME || undefined,
        bootstrap_nodes: process.env.POINT_NODE_BOOTSTRAP_NODES || [],
        identity_contract_address: contractAddresses.Identity,
        storage_provider_registry_contract_address: contractAddresses.StorageProviderRegistry,
    };

    const mnemonic = require('/data/keystore/key.json');
    if (typeof mnemonic !== 'object' || !('phrase' in mnemonic)) {
        throw new Error('Invalid key format');
    }

    const provider = new HDWalletProvider({mnemonic, providerOrUrl: config.network.web3});
    const web3 = new Web3(provider);
    const privateKey = provider.hdwallet._hdkey._privateKey.toString('hex');
    const account = web3.eth.accounts.privateKeyToAccount(`0x${privateKey}`);

    const arweave_key = require('/data/keystore/arweave.json');
    if (typeof arweave_key !== 'object') {
        throw new Error('Unable to parse arweave key');
    }

    config.client = {
        ...config.client,
        storage: {
            ...(config.client && config.client.storage),
            arweave_key,
            arweave_experiment_version_minor: process.env.ARWEAVE_EXPERIMENT_VERSION_MINOR || 7
        },
        wallet: {...(config.client && config.client.wallet), account: account.address, privateKey, secretPhrase: mnemonic.phrase }
    };

    writeFileSync('/data/config.json', JSON.stringify(config, null, 2));
}

async function compilePointContracts() {
    const getImports = function(dependency) {
        const dependencyNodeModulesPath = path.join(__dirname, '..', 'node_modules/', dependency);
        if (!existsSync(dependencyNodeModulesPath)){
            throw new Error(`Could not find contract dependency "${dependency}", have you tried npm install?`);
        }
        return {contents: readFileSync(dependencyNodeModulesPath, 'utf8')};
    };

    for (const contractName in contractAddresses) {
        try {
            const content = readFileSync(path.resolve(__dirname, '..', 'truffle', 'contracts', `${contractName}.sol`), 'utf8');
            const version = await Deployer.getPragmaVersion(content);
            const solc = require(`solc${version.split('.').slice(0, 2).join('_')}`);
            const compileConfig = {
                language: 'Solidity',
                sources: {[contractName+'.sol']: {content}},
                settings: {outputSelection: {'*': {'*': ['*']}}}
            };

            const compiledContract = JSON.parse(solc.compile(JSON.stringify(compileConfig), {import: getImports}));
            if (compiledContract) {
                writeFileSync(
                    path.resolve(__dirname, '..', 'truffle', 'build', 'contracts', `${contractName}.json`),
                    JSON.stringify(compiledContract.contracts[`${contractName}.sol`][contractName]),
                    'utf-8'
                );
            } else {
                throw new Error('Compiled contract is empty');
            }
        } catch (e) {
            console.error('Point contract compilation error:', e);
            throw e;
        }
    }
}

async function profile(callback, description) {
    const start = Date.now();
    await callback();
    console.log(description || callback.toString(), 'completed in', Date.now() - start, 'ms');
}

(async () => {
    try {
        const start = Date.now();

        await profile(() => console.info(execSync(
            'sed -i \'s/timeout: 20000,/timeout: process.env.SUBPROVIDER_RPC_TIMEOUT || 120000,/g\' ' +
            '/app/node_modules/\\@trufflesuite/web3-provider-engine/subproviders/rpc.js'
        ).toString()), 'Patching Subprovider rpc');

        await profile(() => {
            for (const lockfile of ['/data/point.pid', '/data/data/db/LOCK']) if (existsSync(lockfile)) unlinkSync(lockfile);
        }, 'Removing lock files');

        await profile(updateConfig, 'Configuration update');

        await profile(() => {
            if (!existsSync('/data/data')) mkdirSync('/data/data');
            if (!existsSync('/data/data/dht_peercache.db')) writeFileSync('{}', '/data/data/dht_peercache.db');
        }, 'Creating utility files');

        await profile(compilePointContracts, 'Contract compilation');

        await profile(() => console.info(
            execSync(`sequelize-cli db:migrate --config resources/sequelizeConfig.json --env ${process.env.DB_ENV}`).toString(),
        ), 'Running DB migrations');

        console.info('Ready to start the node in', Date.now() - start, 'ms');
        process.exit(0);
    } catch (e) {
        console.error('Error patching config:', e);
        process.exit(1);
    }
})();
