// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
const fs = require('fs');

const build_path = process.env.DEPLOYER_BUILD_PATH || './build/';

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const Identity = await ethers.getContractFactory("Identity");
  const identity = await Identity.deploy();

  await identity.deployed();

  console.log("Identity deployed to:", identity.address);

  fs.writeFileSync('/build/contracts/Identity.sol/Identity-address.json', JSON.stringify({address:identity.address}));
  console.log('Identity abi was copied to build folder');
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
