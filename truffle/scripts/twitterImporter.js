'use strict';

//truffle exec scripts/twitterImporter.js <action> <contract> <migration_file>
//BEWARE: download action must load the current identity contract
//truffle exec scripts/twitterImporter.js --upload 0xdC1092D9D085E4cE60b7370807a24289A543BAd1 1643656897-twitter.json
//truffle exec scripts/twitterImporter.js --download 0x61Db2E6aD1B19E94638d4C73fDe2ba3dE2498B9b 1643307237-identity.json

const fs = require('fs');
const {exit} = require('process');

global.artifacts = artifacts;
global.web3 = web3;

if(process.argv[4] === undefined){
    console.log(`Please use the tags --download or --upload <contract_addresss>`);
    exit(0);
}

if(process.argv[5] === undefined){
    console.log(`Please inform the contract address`);
    exit(0);
}

if(process.argv[6] === undefined){
    console.log(`Please inform the identity list migration file`);
    exit(0);
}

const action = process.argv[4];
const contract = process.argv[5];

async function main(){
    if(action === '--download') {
        await download(contract);
    } else {
        await upload(contract);
    }
}

function loadMigrationFile() {
    const migrationFile = '../resources/migrations/' + process.argv[6];
    return JSON.parse(fs.readFileSync(migrationFile));
}

async function download(contract) {
    const twitterArtifacts = artifacts.require('./Twitter.sol');
    const artifact = artifacts.require('./Identity.sol');
    const identityContract = new web3.eth.Contract(artifact.abi, contract);
    const handle = 'twitter';

    const fileStructure = {tweets:[]};

    // assuming that the contract address is the first key in the ikvList
    const contractKey = await identityContract.methods.ikvList(handle, 0).call();
    const contractAddress = await identityContract.methods.ikvGet(handle, contractKey).call();
    const twitterContract = new web3.eth.Contract(twitterArtifacts.abi, contractAddress);
    
    const data = loadMigrationFile();

    const tweets = [];
    for (const identity of data.identities) {
        console.log('trying to fetch tweets from ' + identity.handle);
        const keepSearchingTweets = true;
        const tweetCounter = 0;
        while (keepSearchingTweets) {
            try {
                const {
                    from,
                    contents,
                    timestamp, 
                    likes
                } = await twitterContract.methods.getTweetByOwner(identity.owner, tweetCounter).call();
               
                const tweet = {
                    from,
                    contents,
                    timestamp,
                    likes
                };

                tweets.push(tweet);
                console.log('Found tweet ' + tweetCounter + ' for ' + identity.handle);
                tweetCounter++;
            } catch (e) {
                console.log('Next');
                keepSearchingTweets = false;
            }
        }
    }

    var unique = Array.from(new Set(tweets.map(JSON.stringify))).map(JSON.parse);

    fileStructure.tweets = unique;

    const timestamp = Math.floor(Date.now() / 1000); 

    fs.writeFileSync(
        '../resources/migrations/' + timestamp + '-twitter.json', 
        JSON.stringify(fileStructure, null, 4)
    );

    console.log('Downloaded');
    exit(0);
}

async function upload(contract) {
    const migrationFile = '../resources/migrations/' + process.argv[6];

    if (!fs.existsSync(migrationFile)) {
        console.log('Migration not found');
        exit(0);
    }

    const twitterArtifacts = artifacts.require('./Twitter.sol');
    const twitterContract = new web3.eth.Contract(twitterArtifacts.abi, contract);
    const accounts = await web3.eth.getAccounts();

    const data = JSON.parse(fs.readFileSync(migrationFile));

    console.log('Adding migrator');
    
    await twitterContract.methods.addMigrator(accounts[0]).send({from:accounts[0]});

    for (const tweet of data.tweets) {
        console.log('Migrating: tweet from ' + tweet.from + ' contents ' + tweet.contents);
        await twitterContract.methods.add(
            tweet.from,
            tweet.contents, 
            tweet.timestamp, 
            tweet.likes
        ).send({from: accounts[0]});
    }

    console.log('Done');
    exit(0);
}

// For truffle exec
module.exports = function(callback) {
    main().then(() => callback()).catch(err => callback(err));
};