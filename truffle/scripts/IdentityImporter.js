'use strict';
const fs = require('fs');

global.artifacts = artifacts;
global.web3 = web3;


async function main(){
    const artifact = artifacts.require("./Identity.sol");
    const sourceContract = new web3.eth.Contract(artifact.abi, '0x61Db2E6aD1B19E94638d4C73fDe2ba3dE2498B9b');
    //const targetContract = new web3.eth.Contract(artifact.abi, '0xfF27950b569FdeE3ddc222953cd9F960E5923e84');
    let accounts = await web3.eth.getAccounts();
    const options = { fromBlock: 0, toBlock: 'latest' }
   
    let fileStructure = {
        "identities":[],
        "ikv":[]
    };

    await sourceContract.getPastEvents('IdentityRegistered', options)
    .then(events => {
        let identities = [];
        for (const e of events) {
            const {handle, identityOwner, commPublicKey} = e.returnValues;
            let identity = {
                handle,
                identityOwner,
                keyPart1:commPublicKey.part1,
                keyPart2:commPublicKey.part2
            }
            identities.push(identity);
        }

        fileStructure.identities = identities;

    }).catch(
        e => console.log(e)
    )
    
    
    await sourceContract.getPastEvents('IKVSet', options)
    .then(events => {
        let ikvs = [];
        for (const e of events) {
            const {identity, key, value} = e.returnValues;
            let ikv = {
                identity,
                key,
                value    
            }
            ikvs.push(ikv);
        }
        fileStructure.ikv = ikvs;
    }).catch(
        e => console.log(e)
    )

    console.log(fileStructure);
}

// For truffle exec
module.exports = function(callback) {
    main().then(() => callback()).catch(err => callback(err))
};