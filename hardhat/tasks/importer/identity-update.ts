import { task } from "hardhat/config";
import fs = require('fs');

//npx hardhat identity-update 0x001fc9C398BF1846a70938c920d0351722F34c83 ./resources/unknown-1337.json --network ynet

task("identity-update", "Will update point identity contract and metadata file")
  .addPositionalParam("address","Identity contract source address")
  .addPositionalParam("metadataFile", "Metadata file with information about the proxy")
  .setAction(async (taskArgs, hre) => {
    const ethers = hre.ethers;

    if(!ethers.utils.isAddress(taskArgs.address)) {
        console.log('Address of contract not valid.');
        return false;
    }

    if(!fs.existsSync(taskArgs.metadataFile)){
        console.log('Metada file does not exists.');
        return false;
    }

    if (!fs.existsSync('./.openzeppelin')){
      fs.mkdirSync('./.openzeppelin');
    }
    fs.copyFileSync(taskArgs.metadataFile, './.openzeppelin/unknown-1337.json');
    const contractF = await hre.ethers.getContractFactory("Identity");
    const proxy = await hre.upgrades.upgradeProxy(taskArgs.address, contractF);
    await proxy.deployed();
    fs.copyFileSync('./.openzeppelin/unknown-1337.json', taskArgs.metadataFile);
    console.log('Identity contract and metadata file updated.')
  });

