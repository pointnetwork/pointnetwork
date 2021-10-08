#!/usr/bin/env node

const {existsSync, writeFileSync, unlinkSync, mkdirSync, renameSync} = require('fs');
const Web3 = require('web3');
const HDWalletProvider = require("@truffle/hdwallet-provider");
const timeout = process.env.AWAIT_CONTRACTS_TIMEOUT || 120000;
const contractAddresses = {
    Identity: process.env.CONTRACT_ADDRESS_IDENTITY,
    Migrations: process.env.CONTRACT_ADDRESS_MIGRATIONS,
    StorageProviderRegistry: process.env.CONTRACT_ADDRESS_STORAGE_PROVIDER_REGISTRY,
};

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

const arweave_key = require('/data/keystore/arweave.json');
if (typeof arweave_key !== 'object') {
    throw new Error('Unable to parse arweave key');
}

config.client = {...config.client, storage: {...(config.client && config.client.storage), arweave_key}};

writeFileSync('/data/config.json', JSON.stringify(config, null, 2));
renameSync('/app/resources/sequelizeConfig.docker.json', '/app/resources/sequelizeConfig.json');

console.info('Config is successfully updated.');

if (!existsSync('/data/data')) {
    mkdirSync('/data/data');
}

if (!existsSync('/data/data/dht_peercache.db')) {
    writeFileSync('{}', '/data/data/dht_peercache.db');
}

const mnemonic = require('/data/keystore/key.json');
if (typeof mnemonic !== 'object' || !('phrase' in mnemonic)) {
    throw new Error('Invalid key format');
}

(async () => {
    console.log('Awaiting for blockchain provider at', config.network.web3);

    const provider = new HDWalletProvider({mnemonic, providerOrUrl: config.network.web3});
    const web3 = new Web3(provider);
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
