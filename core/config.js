const path = require('path');
const {merge} = require('lodash');
const {existsSync} = require('fs');

const arweave_key = require('/data/keystore/arweave.json');
if (typeof arweave_key !== 'object') {
    throw new Error('Unable to parse arweave key');
}

const variables = {
    api: {
        address: process.env.POINT_API_HOST || undefined,
        port: process.env.POINT_API_PORT || undefined
    },
    log: {sendLogsTo: process.env.SEND_LOGS_TO || undefined},
    client: {
        zproxy: {
            host: process.env.POINT_ZPROXY_HOST || undefined,
            port: process.env.POINT_ZPROXY_PORT || undefined
        },
        storage: {
            engine: process.env.POINT_STORAGE_ENGINE || undefined,
            arweave_key,
            arweave_bundler_url: process.env.ARWEAVE_BUNDLER_URL || undefined,
            arweave_gateway_url: process.env.ARWEAVE_GATEWAY_URL || undefined,
            arweave_experiment_version_minor:
                process.env.ARWEAVE_EXPERIMENT_VERSION_MINOR || undefined,
            arweave_port: process.env.ARWEAVE_PORT || undefined,
            arweave_protocol: process.env.ARWEAVE_PROTOCOL || undefined,
            arweave_host: process.env.ARWEAVE_HOST || undefined
        }
    },
    network: {
        web3: process.env.BLOCKCHAIN_URL || undefined,
        web3_network_id: process.env.BLOCKCHAIN_NETWORK_ID || undefined,
        communication_external_host: process.env.POINT_NODE_PUBLIC_HOSTNAME || undefined,
        bootstrap_nodes: process.env.POINT_NODE_BOOTSTRAP_NODES || [],
        identity_contract_address:
            getContractAddress('Identity') ||
            process.env.CONTRACT_ADDRESS_IDENTITY || undefined,
        migrations_contract_address:
            getContractAddress('Migrations') ||
            process.env.CONTRACT_ADDRESS_MIGRATIONS || undefined,
        storage_provider_registry_contract_address:
            getContractAddress('StorageProviderRegistry') ||
            process.env.CONTRACT_ADDRESS_STORAGE_PROVIDER_REGISTRY || undefined
    }
};

function getContractAddress(name) {
    const filename = path.resolve(__dirname, '..', 'truffle', 'build', 'contracts', `${name}.json`);

    if (!existsSync(filename)) {
        return;
    }

    const {networks} = require(filename);

    for (const network in networks) {
        const {address} = networks[network];
        if (address && typeof address === 'string') {
            return address;
        }
    }
}

const datadir = process.env.DATADIR;
const configPath = path.resolve(datadir, 'config.json');
const config = existsSync(configPath) ? require(configPath) : {};
const defaultConfig = require(path.resolve(__dirname, '..', 'resources', 'defaultConfig.json'));
const dbConfig = require(path.resolve(__dirname, '..', 'resources', 'sequelizeConfig.json'));
const dbEnv = process.env.DB_ENV || 'development';

module.exports = merge(defaultConfig, {db: dbConfig[dbEnv]}, config, variables);
