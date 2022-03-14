import { task } from "hardhat/config";
import fs = require('fs');

//npx hardhat identityImporter download 0x1411f3dC11D60595097b53eCa3202c34dbee0CdA --network ynet
//npx hardhat identityImporter download 0x1411f3dC11D60595097b53eCa3202c34dbee0CdA --save-to /Users/alexandremelo/.point/src/pointnetwork/hardhat/  --network ynet

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

    let migrationFolder = '../resources/migrations/';

    if(taskArgs.saveTo != undefined) {
        migrationFolder = taskArgs.saveTo;
    }
      
    if(taskArgs.action == "download") {
        
        const fileStructure = {
            identities: [],
            ikv: []
        } as any;

        const contract = await hre.ethers.getContractAt("Identity", taskArgs.contract);

        let identitiesFilter = contract.filters.IdentityRegistered()
        let identityCreatedEvents = await contract.queryFilter(identitiesFilter);
        let ikvSetFilter = contract.filters.IKVSet()
        let ikvSetEvents = await contract.queryFilter(ikvSetFilter);
    
        if(identityCreatedEvents.length == 0) {
            console.log('No identities found.');
            return false;
        }

        console.log(`Found ${identityCreatedEvents.length} identities`);

        let identityData = [];
        for (const e of identityCreatedEvents) {
            const {handle, identityOwner, commPublicKey} = e.args;

            console.log(`migrating handle ${handle} from ${identityOwner}`);

            const identity = {
                handle,
                owner: identityOwner,
                keyPart1: commPublicKey.part1,
                keyPart2: commPublicKey.part2
            };

            identityData.push(identity);
        }
        
        fileStructure.identities = identityData;

        console.log(`Found ${ikvSetEvents.length} IKV parameters`);

        const ikvData = [];
        for(const e of ikvSetEvents) {
            const {identity, key, value, version} = e.args;

            console.log(`migrating key ${key} with value of ${value}`);

            const ikv = {
                handle: identity,
                key,
                value,
                version
            };

            ikvData.push(ikv);
        }

        fileStructure.ikv = ikvData;

        const timestamp = Math.round(Number(new Date()) / 1000);
        const contractName = 'identity';
        const filename = timestamp + '-' + contractName + '.json';
        fs.writeFileSync(migrationFolder + filename, JSON.stringify(fileStructure, null, 4));

        console.log('Downloaded');
    }else{
    }
  });

