#!/usr/bin/env node

const {existsSync, writeFileSync, readFileSync, unlinkSync, mkdirSync} = require('fs');
const Web3 = require('web3');
const Arweave = require("arweave");
const axios = require("axios");

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
const arweave_init_params = {
    host: process.env.ARWEAVE_HOST,
    port: process.env.ARWEAVE_PORT,
    protocol: process.env.ARWEAVE_PROTOCOL,
    timeout: 20000,
    logging: false,
};

let arweave = Arweave.init(arweave_init_params);

if (!existsSync('/data/keystore/arweave.json')) {
    //generate the wallet for arlocal and mint some tokents
    //only if the key does not exists
    arweave.wallets.generate().then((key) => {
        console.log("Generating key for ArLocal:")
        console.log(key);

        //write the key to the filesystem
        writeFileSync('/data/keystore/arweave.json', JSON.stringify(key, null, 2), 'utf-8');

        //mint some tokens
        arweave.wallets.jwkToAddress(key).then((address) => {
            console.log(address);
            //1seRanklLU_1VTGkEk7P0xAwMJfA7owA1JHW5KyZKlY
            axios.get(`http://arlocal:1984/mint/${address}/100000000000000000000`);
        });
    });
}

//sync
sleepSync(2048);


writeFileSync(targetConfig, JSON.stringify(config, null, 2));

if (!existsSync('/data/data')) {
    mkdirSync('/data/data');
}

if (!existsSync('/data/data/dht_peercache.db')) {
    writeFileSync('/data/data/dht_peercache.db', '{}');
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
