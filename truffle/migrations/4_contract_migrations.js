const twitterMigrations = artifacts.require("./TwitterMigrations.sol");
const twitterMigrations = artifacts.require("./TwitterMigrations.sol");
const blogMigrations = artifacts.require("./BlogMigrations.sol");
const pointSocialMigrations = artifacts.require("./PointSocialMigrations.sol");

module.exports = function(deployer) {
    deployer.deploy(twitterMigrations);
    deployer.deploy(blogMigrations);
    deployer.deploy(pointSocialMigrations);
};
