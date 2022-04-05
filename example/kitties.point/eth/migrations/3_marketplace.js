const KittyCore = artifacts.require("KittyCore");
const MarketPlace = artifacts.require("MarketPlace");

module.exports = function(deployer) {
  deployer.deploy(MarketPlace, KittyCore.address);
};