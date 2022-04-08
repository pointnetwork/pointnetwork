import { task } from "hardhat/config";
import fs = require('fs');

//npx hardhat sms-importer upload NEW_SM_CONTRACT --migration-file ../resources/migrations/sms-TIMESTAMP.json  --network ynet
//npx hardhat sms-importer download 0x1411f3dC11D60595097b53eCa3202c34dbee0CdA --network ynet
//npx hardhat sms-importer download 0x1411f3dC11D60595097b53eCa3202c34dbee0CdA --handle HANDLE_NAME --contract-name CONTRACT_NAME --save-to ../resources/migrations/  --network ynet

task("sms-importer", "Will download and upload data to point identity contract")
  .addPositionalParam("action", 'Use with "download" and "upload options"')
  .addPositionalParam("contract","Identity contract source address")
  .addOptionalParam("saveTo", "Saves migration file to specific directory")
  .addOptionalParam("migrationFile", "Migration file to when uploading data")
  .addOptionalParam("handle", "Which handle to use to discover contract address")
  .addOptionalParam("contractName", "The contract name to use")
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

    let contractName = 'Sms'
    if(taskArgs.contractName !== undefined && taskArgs.contractName !== ''){
        contractName = taskArgs.contractName
    }

    if(taskArgs.action == "download") {
        let zappHandle = 'sms';
        if(taskArgs.handle !== undefined && taskArgs.handle !== ''){
            zappHandle = taskArgs.handle
        }
        console.log('zappHandle = ' + zappHandle);
        console.log('contractName = ' + contractName);

        const fileStructure = {
            tweets: []
        } as any;

        const identity = await hre.ethers.getContractAt("Identity", taskArgs.contract);
        const contractKey = await identity.ikvList(zappHandle, 0);

        const contractAddress = await identity.ikvGet(zappHandle, contractKey);
        const sms = await hre.ethers.getContractAt(contractName, contractAddress);
        let keepSearchingTweets = true;
        let tweetCounter = 0;
        let tweets = [];

        while(keepSearchingTweets) {
            try{
                const {from, contents, timestamp, likes} = await sms.getTweet(tweetCounter.toString());
                const tweet = {
                    from,
                    contents,
                    timestamp:timestamp.toString(),
                    likes:likes.toString()
                };
                tweets.push(tweet);
                console.log('Found tweet ' + tweetCounter + ' from ' + from);
                tweetCounter++;
            } catch (error) {
                console.log('Finished');
                keepSearchingTweets = false;
            }
        }

        fileStructure.tweets = tweets;

        const timestamp = Math.round(Number(new Date()) / 1000);
        const filename =  `sms-${timestamp}.json`;

        fs.writeFileSync(migrationFolder + filename, JSON.stringify(fileStructure, null, 4));
    }else{
        const lockFilePath = '../resources/migrations/sms-lock.json';

        if(taskArgs.migrationFile === undefined) {
            console.log('Please inform the migration file with `--migration-file /path/to/file.json`');
            return false;
        }

        const data = JSON.parse(fs.readFileSync(taskArgs.migrationFile).toString());

        let processTweetsFrom = 0;
        let lastProcessedTweet = 0;
        let foundLockFile = false;

        const sms = await hre.ethers.getContractAt(contractName, taskArgs.contract);
        const [owner] = await ethers.getSigners();
        const lockFileStructure = {
            contract:taskArgs.contract.toString(),
            migrationFilePath:taskArgs.migrationFile.toString(),
            lastProcessedTweet:0,
        } as any;

        try{
            console.log('Trying to add migrator');
            await sms.addMigrator(owner.address);
        } catch(error) {
            console.log("Error trying to add migrator, migrator is already set?");
        }

        if (!fs.existsSync(lockFilePath)) {
            console.log(`Lockfile not found, adding migrator ${owner.address}`);
        }else{
            const lockFile = JSON.parse(fs.readFileSync(lockFilePath).toString());
            if (lockFile.migrationFilePath == taskArgs.migrationFile.toString() &&
                lockFile.contract == taskArgs.contract.toString()) {
                console.log('Previous lock file found');
                foundLockFile = true;
                processTweetsFrom = lockFile.lastProcessedTweet;
            }
        }

        try {
            console.log(`found ${data.tweets.length}`);
            for (const tweet of data.tweets) {
                lastProcessedTweet++;
                if(lastProcessedTweet > processTweetsFrom || processTweetsFrom == 0){
                    console.log('Migrating: tweet from ' + tweet.from + ' contents ' + tweet.contents);
                    await sms.add(
                        tweet.from,
                        tweet.contents,
                        tweet.timestamp,
                        tweet.likes
                    );
                }else{
                    console.log(`Skipping migrated sm from ${tweet.from}`);
                }
            }

            if(fs.existsSync(lockFilePath)) {
                fs.unlinkSync(lockFilePath);
            }

            console.log('Everything processed and uploaded, lock file removed.');
        } catch (error) {
            lockFileStructure.lastProcessedTweet = lastProcessedTweet;
            fs.writeFileSync(lockFilePath, JSON.stringify(lockFileStructure, null, 4));
            console.log(`Error on Sms import restart the process to pick-up from last processed item.`);
            return false;
        }

    }
  });
