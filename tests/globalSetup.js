const initFolders = require('../dist/initFolders');
const initStorage = require('../dist/client/storage/init');
const migrate = require('../dist/util/migrate');
const path = require('path');

process.env.HARDHAT_CONFIG = path.resolve(__dirname, '..', 'hardhat', 'hardhat.config.js');

module.exports = async () => {
    if (process.env.TESTING_IN_DOCKER) {
        const {getContractAddress} = require('../dist/util');

        const identityContractAddress = getContractAddress('Identity');
        if (!identityContractAddress) {
            throw new Error('Could not get Identity contract address');
        }
        process.env.IDENTITY_CONTRACT_ADDRESS = identityContractAddress;
    }

    await initFolders.default();
    await migrate.default();
    await initStorage.default();
};
