#!/usr/bin/env node

const {existsSync, writeFileSync, unlinkSync, mkdirSync} = require('fs');
const Web3 = require('web3');
const timeout = process.env.AWAIT_CONTRACTS_TIMEOUT || 120000;
const templateConfig = '/nodeConfig.json';
const targetConfig = '/data/config.json';
const contractAddresses = {
    Identity: process.env.CONTRACT_ADDRESS_IDENTITY,
    Migrations: process.env.CONTRACT_ADDRESS_MIGRATIONS,
    StorageProviderRegistry: process.env.CONTRACT_ADDRESS_STORAGE_PROVIDER_REGISTRY,
};

const lockfiles = ['/data/point.pid', '/data/data/db/LOCK'];

for (const lockfile of lockfiles) if (existsSync(lockfile)) unlinkSync(lockfile);

console.info('Updating configuration file...');

const sleepSync = time => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, time);
const config = require(templateConfig);
const {
    BLOCKCHAIN_HOST = 'localhost',
    BLOCKCHAIN_PORT = 9090,
    BLOCKCHAIN_PATH,
} = process.env;

config.network = {
    ...config.network,
    web3: `http://${BLOCKCHAIN_HOST}:${BLOCKCHAIN_PORT}${BLOCKCHAIN_PATH ? `/${BLOCKCHAIN_PATH}` : ``}`,
    identity_contract_address: contractAddresses.Identity,
    storage_provider_registry_contract_address: contractAddresses.StorageProviderRegistry,
};

if (process.env.BLOCKCHAIN_NETWORK_ID) {
    config.network.web3_network_id = process.env.BLOCKCHAIN_NETWORK_ID;
}

writeFileSync(targetConfig, JSON.stringify(config, null, 2));

if (!existsSync('/data/data')) {
    mkdirSync('/data/data');
}

if (!existsSync('/data/data/dht_peercache.db')) {
    writeFileSync('{}', '/data/data/dht_peercache.db');
}

console.info('Done.');

(async () => {
    console.log('Awaiting for blockchain provider at', config.network.web3);

    const web3 = new Web3(config.network.web3);
    const start = Date.now();

    while (Date.now() - start < timeout) {
        try {
            await web3.eth.getBlockNumber();
            return console.info('Done.');
        } catch (e) {
            sleepSync(1024);
        }
    }

    console.error(`Unable to reach blockchain provider at ${ config.network.web3 }`);
    process.exit(1);
})();
