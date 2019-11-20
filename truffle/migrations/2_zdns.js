const ZDNS = artifacts.require("./ZDNS.sol");

module.exports = function(deployer) {
    deployer.deploy(ZDNS);
};
