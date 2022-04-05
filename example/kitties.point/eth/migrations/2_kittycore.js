const KittyCore = artifacts.require("KittyCore");

module.exports = async function(deployer) {
  await deployer.deploy(KittyCore);
  const instance = await KittyCore.deployed();
  instance.createGen0Kitty(0);
  instance.createGen0Kitty(1);
  instance.createGen0Kitty(2);
  instance.createGen0Kitty(3);
};
