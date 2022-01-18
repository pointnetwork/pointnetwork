const identity = artifacts.require("./Identity.sol");

module.exports = function(deployer) {
    deployer.deploy(identity);
}