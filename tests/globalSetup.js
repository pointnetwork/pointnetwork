const initFolders = require('../dist/initFolders');
const initStorage = require('../dist/client/storage/init');
const migrate = require('../dist/util/migrate');
const path = require('path');

process.env.HARDHAT_CONFIG = path.resolve(__dirname, '..', 'hardhat', 'hardhat.config.js');

module.exports = async () => {
    if (process.env.TESTING_IN_DOCKER) {
        const {getContractAddress} = require('../dist/util');

        const identityContractAddress = getContractAddress('Identity');
        const subscriptionContractAddress = getContractAddress('Subscription');
        const wpointContractAddress = getContractAddress('WPOINT');
        if (!identityContractAddress) {
            throw new Error('Could not get Identity contract address');
        }
        if (!subscriptionContractAddress) {
            throw new Error('Could not get Subscription contract address');
        }
        if (!wpointContractAddress) {
            throw new Error('Could not get WPOINT contract address');
        }
        process.env.IDENTITY_CONTRACT_ADDRESS = identityContractAddress;
        process.env.SUBSCRIPTION_CONTRACT_ADDRESS = subscriptionContractAddress;
        process.env.WPOINT_CONTRACT_ADDRESS = subscriptionContractAddress;
    }

    await initFolders.default();
    await migrate.default();
    await initStorage.default();
};
