#!/usr/bin/env node

const {existsSync, writeFileSync, unlinkSync, mkdirSync, readFileSync} = require('fs');
const {execSync} = require('child_process');
const path = require('path');
const config = require('../core/config');
const log = require('../core/log').child({module: __filename, account: config.client.wallet.account});
const Web3 = require('web3');
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

async function compilePointContracts() {
    log.debug(contractAddresses, 'Compiling point contracts');

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
            log.error({error: e}, 'Point contract compilation error');
            throw e;
        }
    }
    log.info(contractAddresses, 'Successfully compiled point contracts');
}

if (!existsSync('/data/data')) {
    mkdirSync('/data/data');
}

if (!existsSync('/data/data/dht_peercache.db')) {
    writeFileSync('{}', '/data/data/dht_peercache.db');
}

(async () => {
    try {
        await compilePointContracts();

        const web3 = new Web3(config.network.web3);
        log.info({provider: config.network.web3, timeout}, 'Awaiting for blockchain provider');

        const start = Date.now();
        let error;

        while (Date.now() - start < timeout) {
            log.info({provider: config.network.web3, start, error}, 'Polling block number');
            try {
                const blockNumber = await web3.eth.getBlockNumber();
                log.info({blockNumber}, 'Success');
                log.info('Point is ready');
                return;
            } catch (e) {
                log.error(e, 'Polling loop Error:');
                throw e;
            }
        }
    } catch (error) {
        log.error({provider: config.network.web3}, 'Unable to reach blockchain');
        process.exit(1);
    }
})();
