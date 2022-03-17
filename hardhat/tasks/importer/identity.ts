import { task } from "hardhat/config";
import fs = require('fs');

//npx hardhat identity-importer upload 0x001fc9C398BF1846a70938c920d0351722F34c83 --migration-file /Users/alexandremelo/.point/src/pointnetwork/resources/migrations/identity-1647299819.json  --network ynet
//npx hardhat identity-importer download 0x1411f3dC11D60595097b53eCa3202c34dbee0CdA --network ynet
//npx hardhat identity-importer download 0x1411f3dC11D60595097b53eCa3202c34dbee0CdA --save-to /Users/alexandremelo/.point/src/pointnetwork/hardhat/  --network ynet

task("identity-importer", "Will download and upload data to point identity contract")
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
            contract:taskArgs.contract.toString(),
            migrationFilePath:taskArgs.migrationFile.toString(),
            identityLastProcessedIndex:0,
            ikvLastProcessedIndex:0
        } as any;

        const data = JSON.parse(fs.readFileSync(taskArgs.migrationFile).toString());

        let processIdentityFrom = 0;
        let processIkvFrom = 0;
        let lastIdentityAddedIndex = 0;
        let lastIkvAddedIndex = 0;
        let foundLockFile = false;

        if (!fs.existsSync(lockFilePath)) {
            console.log('Lockfile not found');
        }else{
            const lockFile = JSON.parse(fs.readFileSync(lockFilePath).toString());
            if (lockFile.migrationFilePath == taskArgs.migrationFile.toString() && 
                lockFile.contract == taskArgs.contract.toString()) {
                console.log('Previous lock file found');
                console.log(`Last processed identity ${lockFile.identityLastProcessedIndex}`);
                console.log(`Last IVK param ${lockFile.ikvLastProcessedIndex}`);
                foundLockFile = true;
                processIdentityFrom = lockFile.identityLastProcessedIndex;
                processIkvFrom = lockFile.ikvLastProcessedIndex;
            }
        }

        try {
            console.log(`found ${data.identities.length}`);
            for (const identity of data.identities) {
                lastIdentityAddedIndex++;
                if(lastIdentityAddedIndex > processIdentityFrom || processIdentityFrom == 0){
                    console.log(`${lastIdentityAddedIndex} migrating ${identity.handle}`);
                    await contract.register(identity.handle, identity.owner, identity.keyPart1, identity.keyPart2);
                }else{
                    console.log(`Skipping migrated identity ${identity.handle}`)
                }
            }
        } catch (error) {
            lockFileStructure.identityLastProcessedIndex = lastIdentityAddedIndex;
            fs.writeFileSync(lockFilePath, JSON.stringify(lockFileStructure, null, 4));
            console.log(`Error on ${lastIdentityAddedIndex} of ${data.identities.length} identities restart the process to pick-up from last processed item.`);
            return false;
        }

        lockFileStructure.identityLastProcessedIndex = lastIdentityAddedIndex;

        try {
            console.log(`found ${data.ikv.length} IKV params`);
            for (const ikv of data.ikv) {
                lastIkvAddedIndex++;
                if(lastIkvAddedIndex > processIkvFrom || processIkvFrom == 0){
                    console.log(`${lastIkvAddedIndex} Migrating IVK param for ${ikv.handle} ${ikv.key} ${ikv.value}`)
                    await contract.ikvImportKV(ikv.handle, ikv.key, ikv.value, ikv.version);
                }else{
                    console.log(`Skipping migrated IVK param for ${ikv.handle} ${ikv.key} ${ikv.value}`)
                }
            }
        } catch (error) {
            lockFileStructure.ikvLastProcessedIndex = lastIkvAddedIndex;
            fs.writeFileSync(lockFilePath, JSON.stringify(lockFileStructure, null, 4));
            console.log(`Error on ${lastIkvAddedIndex} of ${data.ikv.length} IVK params restart the process to pick-up from last processed item.`);
            return false;
        }

        if(lastIdentityAddedIndex == data.identities.length && lastIkvAddedIndex == data.ikv.length) {
            if(fs.existsSync(lockFilePath)) {
                fs.unlinkSync(lockFilePath);
            }
            console.log('Everything processed and uploaded, lock file removed.');
            await contract.finishMigrations();
        }
    }

  });

