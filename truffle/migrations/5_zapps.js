const twitter = artifacts.require("./Twitter.sol");
const blog = artifacts.require("./Blog.sol");

module.exports = function(deployer) {
    deployer.deploy(twitter);
    deployer.deploy(blog);
};
