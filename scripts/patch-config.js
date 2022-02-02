#!/usr/bin/env node

const {existsSync, writeFileSync, unlinkSync, mkdirSync, readFileSync, copyFileSync} = require('fs');
const {execSync} = require('child_process');
const path = require('path');
const Web3 = require('web3');
const HDWalletProvider = require("@truffle/hdwallet-provider");
const Deployer = require('../client/zweb/deployer');
const timeout = process.env.AWAIT_CONTRACTS_TIMEOUT || 120000;
const contractAddresses = {
    Identity: process.env.CONTRACT_ADDRESS_IDENTITY,
    Migrations: process.env.CONTRACT_ADDRESS_MIGRATIONS,
    StorageProviderRegistry: process.env.CONTRACT_ADDRESS_STORAGE_PROVIDER_REGISTRY,
};

console.info(
    'Patching Subprovider rpc',
    execSync('sed -i \'s/timeout: 20000,/timeout: process.env.SUBPROVIDER_RPC_TIMEOUT || 120000,/g\' /app/node_modules/\\@trufflesuite/web3-provider-engine/subproviders/rpc.js').toString()
);

const lockfiles = ['/data/point.pid', '/data/data/db/LOCK'];

for (const lockfile of lockfiles) if (existsSync(lockfile)) unlinkSync(lockfile);

console.info('Updating configuration file...');

const sleepSync = time => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, time);
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

console.info('Config is successfully updated.');

async function compilePointContracts() {
    console.info('Compiling point contracts:', contractAddresses);

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
    console.info('Successfully compiled point contracts:', Object.keys(contractAddresses).join(', '));
}

if (!existsSync('/data/data')) {
    mkdirSync('/data/data');
}

if (!existsSync('/data/data/dht_peercache.db')) {
    writeFileSync('{}', '/data/data/dht_peercache.db');
}

(async () => {
    await compilePointContracts();

    console.log('Awaiting for blockchain provider at', config.network.web3);

    const start = Date.now();

    while (Date.now() - start < timeout) {
        try {
            await web3.eth.getBlockNumber();
            await provider.engine.stop();
            return console.info('Done.');
        } catch (e) {
            sleepSync(1024);
        }
    }

    console.error(`Unable to reach blockchain provider at ${ config.network.web3 }`);
    process.exit(1);
})();
