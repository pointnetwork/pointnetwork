import { task } from "hardhat/config";
import fs = require('fs');
import { last } from "lodash";
import { string } from "hardhat/internal/core/params/argumentTypes";

//npx hardhat identityImporter upload 0x001fc9C398BF1846a70938c920d0351722F34c83 --migration-file /Users/alexandremelo/.point/src/pointnetwork/resources/migrations/identity-1647299819.json  --network ynet
//npx hardhat identityImporter download 0x1411f3dC11D60595097b53eCa3202c34dbee0CdA --network ynet
//npx hardhat identityImporter download 0x1411f3dC11D60595097b53eCa3202c34dbee0CdA --save-to /Users/alexandremelo/.point/src/pointnetwork/hardhat/  --network ynet

task("identityImporter", "Will download and upload data to point identity contract")
  .addPositionalParam("action", 'Use with "download" and "upload options"')
  .addPositionalParam("contract","Identity contract source address")
  .addOptionalParam("saveTo", "Saves migration file to specific directory")
  .addOptionalParam("migrationFile", "Migration file to when uploading data")
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
    const contract = await hre.ethers.getContractAt("Identity", taskArgs.contract);
      
    if(taskArgs.action == "download") {
        
        const fileStructure = {
            identities: [],
            ikv: []
        } as any;

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
        const filename =  `identity-${timestamp}.json`;

        fs.writeFileSync(migrationFolder + filename, JSON.stringify(fileStructure, null, 4));

        console.log('Downloaded');
    } else {

        const lockFilePath = '../resources/migrations/identity-lock.json';

        if(taskArgs.migrationFile === undefined) {
            console.log('Please inform the migration file with `--migration-file /path/to/file.json`');
            return false;
        }

        const lockFileStructure = {
            migrationFilePath:taskArgs.migrationFile.toString(),
            identityLastProcessedIndex:0,
            ikvLastProcessedIndex:0
        } as any;

        const data = JSON.parse(fs.readFileSync(taskArgs.migrationFile).toString());

        let lastIdentityAddedIndex = 0;
        let lastIkvAddedIndex = 0;
        
        try {
            console.log(`found ${data.identities.length} identities `);
            for (const identity of data.identities) {
                lastIdentityAddedIndex++;
                console.log(`migrating ${identity.handle} identities `);
                if(lastIdentityAddedIndex == 5) {
                    throw new Error('test error');
                }
                //await contract.register(identity.handle, identity.owner, identity.keyPart1, identity.keyPart2);
            }
        } catch (error) {
            lockFileStructure.identityLastProcessedIndex = lastIdentityAddedIndex;
            fs.writeFileSync(lockFilePath, JSON.stringify(lockFileStructure, null, 4));
            console.log(`Error on ${lastIdentityAddedIndex} of ${data.identities.length} identities restart the process to pick-up from last processed item.`);
            return false;
        }


        /*
        try {
            for (const ikv of data.ikv) {
                lastIkvAddedIndex++;
                console.log('Migrating IKV value for: ' + ikv.handle);
                if(lastIdentityAddedIndex == 5) {
                    throw new Error('test error');
                }
                //await contract.register(identity.handle, identity.owner, identity.keyPart1, identity.keyPart2);
            }
        } catch (error) {
            lockFileStructure.lastIkvAddedIndex = lastIkvAddedIndex;
        }
            */

        console.log(lockFileStructure);

    }
  });

