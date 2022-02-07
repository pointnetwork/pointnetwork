const StorageProviderRegistry = artifacts.require('./StorageProviderRegistry.sol');

module.exports = function (deployer) {
    deployer.deploy(StorageProviderRegistry);
};
