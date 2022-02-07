#!/usr/bin/env node

const {existsSync, writeFileSync, unlinkSync, mkdirSync} = require('fs');
const Web3 = require('web3');
const timeout = process.env.AWAIT_CONTRACTS_TIMEOUT || 120000;
const templateConfig = '/nodeConfig.json';
const targetConfig = '/data/config.json';
const contractBuildDir = '/app/truffle/build/contracts';
const contractAddresses = {
    Identity: undefined,
    Migrations: undefined,
    StorageProviderRegistry: undefined
};

const lockfiles = ['/data/point.pid', '/data/data/db/LOCK'];

for (const lockfile of lockfiles) if (existsSync(lockfile)) unlinkSync(lockfile);

const sleepSync = time => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, time);
const contractNames = new Set(Object.keys(contractAddresses));
const start = Date.now();

while (contractNames.size && (Date.now() - start < timeout)) {
    for (const contractName of contractNames) {
        const filename = `${ contractBuildDir }/${ contractName }.json`;

        try {
            if (!existsSync(filename)) continue;

            delete require.cache[require.resolve(filename)];

            const {networks} = require(filename);
            const network = process.env.BLOCKCHAIN_NETWORK_ID || Math.max(...Object.keys(networks));

            if (!(network in networks) || (typeof networks[network].address !== 'string')) continue;

            contractAddresses[contractName] = networks[network].address;
            contractNames.delete(contractName);

        } catch (e) {
            console.error(e);
            // todo
        }
    }

    sleepSync(2048);
}

if (contractNames.size) {
    console.error('Timeout error:');
    console.error(`Could not find contract build file(s): ${ Array.from(contractNames).join(', ') }`);

    process.exit(1);
}

console.info('Updating configuration file...');

const config = require(templateConfig);

config.network = {
    ...config.network,
    web3: `http://${ process.env.BLOCKCHAIN_HOST || 'localhost' }:${ process.env.BLOCKCHAIN_PORT || 7545 }`,
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
    writeFileSync('/data/data/dht_peercache.db', '{}');
}

if (!existsSync('/data/keystore/arweave.json')) {
    writeFileSync('/data/keystore/arweave.json', '{}');
}

console.info('Done.');

(async () => {
    console.log('Awaiting for blockchain provider to start...');

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
