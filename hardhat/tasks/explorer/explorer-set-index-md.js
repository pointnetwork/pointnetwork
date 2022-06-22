/* eslint-disable no-console */
const {task} = require('hardhat/config');
const fs = require('fs');
const fetch = require('node-fetch');
const FormData = require('form-data');
const https = require('https');

//npx hardhat complie
//npx hardhat explorer-set-index-md explorer 0xD61e5eFcB183418E1f6e53D0605eed8167F90D4d test.md localhost 65501 --network development

task('explorer-set-index-md', 'Will update MD file from index of explorer')
    .addPositionalParam('identity', 'Identity where the ikv will be set')
    .addPositionalParam('address', 'Identity contract source address')
    .addPositionalParam('file', 'The markdown content file to upload')
    .addPositionalParam('host', 'Host of point node to connect')
    .addPositionalParam('port', 'Port of point node to connect')
    .setAction(async (taskArgs, hre) => {
        https.globalAgent.options.rejectUnauthorized = false;
    
        const file = fs.createReadStream(taskArgs.file);
        const form = new FormData();
        form.append('my_file', file);
    
        const response = await fetch(`https://${taskArgs.host}:${taskArgs.port}/_storage/`, {
            method: 'POST',
            body: form
        });
        let fileId = null;
        if (response.ok){
            const json = await response.json();
            fileId = json.data;
            console.log('fileId = ' + fileId);
        } else {
            throw new Error('Error sending file to arweave');
        }

        const contractF = await hre.ethers.getContractFactory('Identity');
        const identityContract = await contractF.attach(taskArgs.address);

        try {
            await identityContract.ikvPut(taskArgs.identity, 'markdown/index', fileId, '0.1');
        } catch (e){
            console.log('error while adding ikv');
            throw e;
        }
        console.log('Ikv set successfully');
    
    });