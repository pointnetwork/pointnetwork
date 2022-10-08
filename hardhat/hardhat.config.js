require('@typechain/hardhat');
require('@nomiclabs/hardhat-ethers');
require('./tasks/explorer/explorer-set-index-md');
const config = require('config');
const path = require('path');
const os = require('os');

const resolveHome = (filepath) => {
    if (filepath[0] === '~') {
        return path.join(process.env.HOME || os.homedir(), filepath.slice(1));
    }
    return filepath;
};

let privateKey;
// This will read either from config or from DEPLOYER_ACCOUNT env var
if (config.has('deployer_account')) {
    privateKey = config.get('deployer_account');
} else {
    const keystorePath = config.get('wallet.keystore_path');
    const wallet = require('ethereumjs-wallet').hdkey.fromMasterSeed(
        require('bip39').mnemonicToSeedSync(
            require(
                path.join(
                    keystorePath.startsWith('~')
                        ? `${os.homedir()}/${keystorePath.slice(1)}`
                        : keystorePath,
                    'key.json'
                )
            ).phrase
        )
    ).getWallet();
    privateKey = wallet.getPrivateKey().toString('hex');
    if (!privateKey) {
        throw new Error('private key is not set.');
    }
}

const defaultNetwork = config.get('network.default_network');
const networks = config.get('network.web3');

const optimizerConfig = {
    optimizer: {
        enabled: true,
        runs: 1000
    }
};

module.exports = {
    solidity: {
        compilers: [
            {
                version: '0.8.0',
                settings: {...optimizerConfig}
            },
            {
                version: '0.8.4',
                settings: {...optimizerConfig}
            },
            {
                version: '0.8.7',
                settings: {...optimizerConfig}
            }
        ]
    },
    paths: {
        root: path.join(resolveHome(config.get('datadir')), 'hardhat'),
        artifacts: path.join(resolveHome(config.get('datadir')), 'hardhat', 'build'),
        sources: path.join(resolveHome(config.get('datadir')), 'hardhat', 'contracts'),
        tests: path.join(resolveHome(config.get('datadir')), 'hardhat', 'tests'),
        cache: path.join(resolveHome(config.get('datadir')), 'hardhat', 'cache')
    },
    networks: Object.keys(networks)
        .filter(key => networks[key].type === 'eth')
        .reduce((acc, cur) => ({
            ...acc,
            [cur]: {
                url: `http${networks[cur].tls ? 's' : ''}://${networks[cur].http_address}`,
                accounts: [privateKey],
                ...(networks[cur].gas_price_wei ? {gasPrice: networks[cur].gas_price_wei} : {})
            }
        }), {}),
    defaultNetwork
};
