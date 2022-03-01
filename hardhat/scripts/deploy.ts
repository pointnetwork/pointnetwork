// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
const fs = require('fs');


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
  // We get the contract to deploy
  const StorageProvider = await ethers.getContractFactory("StorageProviderRegistry");
  const storageProvider = await StorageProvider.deploy();

  await identity.deployed();
  await storageProvider.deployed();

  console.log("Identity deployed to:", identity.address);
  console.log("StorageProviderRegistry deployed to:", storageProvider.address);

  const identityABI = {
    address: identity.address,
    abi: identity.interface.format('json')
  };

  const storageABI = {
    address: storageProvider.address,
    abi: storageProvider.interface.format('json')
  };

  fs.writeFileSync('build/contracts/Identity.json',identityABI.toString());
  fs.writeFileSync('build/contracts/StorageProviderRegistry.json', storageABI.toString());
  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
