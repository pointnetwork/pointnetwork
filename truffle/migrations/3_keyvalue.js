const KeyValue = artifacts.require("./KeyValue.sol");

module.exports = function(deployer) {
    deployer.deploy(KeyValue);
};
