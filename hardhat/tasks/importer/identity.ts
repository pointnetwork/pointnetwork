import { Console } from "console";
import { task } from "hardhat/config";

task("identityImporter", "Will download and upload data to point identity contract")
  .addPositionalParam("action", 'Use with "download" and "upload options"')
  .addPositionalParam("contract","Identity contract source address")
  .addOptionalParam("saveTo", "Saves migration file to specific directory")
  .setAction(async (taskArgs, hre) => {
    const ethers = hre.ethers;

    if(!ethers.utils.isAddress(taskArgs.contract)) {
        console.log('Contract not valid.');
        return false;
    }

    let migrationFolder = '../../resources/migrations/';

    if(taskArgs.saveTo != undefined) {
        migrationFolder = taskArgs.saveTo;
    }

    //const factory = await ethers.getContractFactory("Identity");
    /*
    const contract = await factory.attach(
        taskArgs.contract
    );*/
      
    if(taskArgs.action == "download") {
        const fileStructure = {
            identities: [],
            ikv: []
        };

        const contract = await hre.ethers.getContractAt("Identity", taskArgs.contract);
        let eventFilter = contract.filters.IdentityRegistered()
        let events = await contract.queryFilter(eventFilter);
    
        if(events.length == 0) {
            console.log('No identities found.');
            return false;
        }

        console.log(events);

    }else{
    }
  });
