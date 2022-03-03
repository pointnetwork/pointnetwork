'use strict';

//truffle exec scripts/identityImporter.js --upload 0x61Db2E6aD1B19E94638d4C73fDe2ba3dE2498B9b 1643305855-identity.json
//truffle exec scripts/identityImporter.js --download 0x61Db2E6aD1B19E94638d4C73fDe2ba3dE2498B9b

const fs = require('fs');
const {exit} = require('process');

global.artifacts = artifacts;
global.web3 = web3;

if (process.argv[4] === undefined) {
    console.log(`Please use the tags --download or --upload <contract_addresss>`);
    exit(0);
}

if (process.argv[5] === undefined) {
    console.log(`Please inform the contract address`);
    exit(0);
}

const action = process.argv[4];
const contract = process.argv[5];

async function main() {
    if (action === '--download') {
        await download(contract);
    } else {
        await upload(contract);
    }
}

async function upload(contract) {
    if (process.argv[6] === undefined) {
        console.log(`Please inform the migration file`);
        exit(0);
    }

    const migrationFile = '../resources/migrations/' + process.argv[6];

    if (!fs.existsSync(migrationFile)) {
        console.log('Migration not found');
        exit(0);
    }

    const data = JSON.parse(fs.readFileSync(migrationFile));

    const artifact = artifacts.require('./Identity.sol');
    const targetContract = new web3.eth.Contract(artifact.abi, contract);
    const accounts = await web3.eth.getAccounts();
    for (const identity of data.identities) {
        console.log('Migrating: ' + identity.handle);
        await targetContract.methods
            .register(identity.handle, identity.owner, identity.keyPart1, identity.keyPart2)
            .send({from: accounts[0]});
    }

    for (const ikv of data.ikv) {
        console.log('Migrating IKV value for: ' + ikv.handle);
        let version;
        if(ikv.hasOwnProperty('version')){
            version = ikv.version;
        }else{
            //fixed version for first time migration
            version = '0.1.0';
        }
        await targetContract.methods
             .ikvImportKV(ikv.handle, ikv.key, ikv.value, version)
             .send({from: accounts[0]});
    }

    console.log('Closing migrations');
    await targetContract.methods.finishMigrations().send({from: accounts[0]});

    console.log('Closed migrations');
}

async function download(contract) {
    const artifact = artifacts.require('./Identity.sol');
    const sourceContract = new web3.eth.Contract(artifact.abi, contract);
    const options = {fromBlock: 0, toBlock: 'latest'};

    const fileStructure = {
        identities: [],
        ikv: []
    };

    await sourceContract
        .getPastEvents('IdentityRegistered', options)
        .then(events => {
            const identities = [];
            for (const e of events) {
                const {handle, identityOwner, commPublicKey} = e.returnValues;

                console.log('Found: ' + handle);

                const identity = {
                    handle,
                    owner: identityOwner,
                    keyPart1: commPublicKey.part1,
                    keyPart2: commPublicKey.part2
                };
                identities.push(identity);
            }

            fileStructure.identities = identities;
        })
        .catch(e => console.log(e));

    await sourceContract
        .getPastEvents('IKVSet', options)
        .then(events => {
            const ikvs = [];
            for (const e of events) {
                const {identity, key, value} = e.returnValues;
                const ikv = {
                    handle: identity,
                    key,
                    value
                };
                
                if(e.returnValues.hasOwnProperty('version')){
                    ikv.version = e.returnValues.version;
                }
                ikvs.push(ikv);
            }
            fileStructure.ikv = ikvs;
        })
        .catch(e => console.log(e));

    const timestamp = Math.round(Number(new Date()) / 1000);
    const contractName = 'identity';
    const filename = timestamp + '-' + contractName + '.json';

    fs.writeFileSync('../resources/migrations/' + filename, JSON.stringify(fileStructure, null, 4));
    console.log('Downloaded');
    exit(0);
}

// For truffle exec
module.exports = function (callback) {
    main()
        .then(() => callback())
        .catch(err => callback(err));
};
