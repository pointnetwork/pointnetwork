import { task } from "hardhat/config";

// npx hardhat identityImporter download 0x61Db2E6aD1B19E94638d4C73fDe2ba3dE2498B9b --network ynet

task("identityImporter", "Will download and upload data to point identity contract")
  .addPositionalParam("action", 'Use with "download" and "upload options"')
  .addPositionalParam("contract","Identity contract source address")
  .addOptionalParam("saveTo", "Saves migration file to specific directory")
  .setAction(async (taskArgs) => {
    if(taskArgs.action == "download") {
        console.log('asdasdsadsa');
    }else{
        console.log('12121222222');
    }
  });
