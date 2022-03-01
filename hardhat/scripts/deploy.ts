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

  // File destination.txt will be created or overwritten by default.
  fs.copyFile('artifacts/contracts/Identity.sol/Identity.json', 'build/contracts/Identity.json', (err: any) => {
    if (err) {
        throw err;
    } 

    fs.writeFileSync('build/contracts/Identity-address.json', JSON.stringify({address:identity.address}));

    console.log('Identity abi was copied to build folder');
  });

  // File destination.txt will be created or overwritten by default.
  fs.copyFile('artifacts/contracts/StorageProviderRegistry.sol/StorageProviderRegistry.json', 'build/contracts/StorageProviderRegistry.json', (err: any) => {
    if (err) {
        throw err;
    } 

    fs.writeFileSync('build/contracts/StorageProviderRegistry-address.json', JSON.stringify({address:storageProvider.address}));

    console.log('StorageProviderRegistry abi was copied to build folder');
  });
    

//  fs.writeFileSync('build/contracts/Identity.json',identityABI.toString());
  //fs.writeFileSync('build/contracts/StorageProviderRegistry.json', storageABI.toString());
  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
