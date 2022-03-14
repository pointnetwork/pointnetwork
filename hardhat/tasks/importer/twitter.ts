import { task } from "hardhat/config";

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
