import { task } from "hardhat/config";
import fs = require('fs');
import {getProxyMetadataFilePath} from '../../utils';

//npx hardhat complie
//npx hardhat identity-update 0xD61e5eFcB183418E1f6e53D0605eed8167F90D4d ./resources/unknown-1337.json --network development

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

    if (!fs.existsSync('.openzeppelin')){
      fs.mkdirSync('.openzeppelin');
    }
    const proxyMetadataFilePath = await getProxyMetadataFilePath(ethers.provider);
    fs.copyFileSync(taskArgs.metadataFile, proxyMetadataFilePath);

    const contractF = await hre.ethers.getContractFactory("Identity");
    const proxy = await hre.upgrades.upgradeProxy(taskArgs.address, contractF);
    await proxy.deployed();

    fs.copyFileSync(proxyMetadataFilePath, taskArgs.metadataFile);
    console.log('Identity contract and metadata file updated.')
  });

