'use strict';

//truffle exec scripts/pointSocialImporter.js <action> <contract> <migration_file>

//BEWARE: upload function uses target deployed PointSocial contract
//truffle exec scripts/pointSocialImporter.js --upload 0x9AFE3DfB2920d669579B6780eb858A36dAA576b8 1644243059-pointsocial.json

//BEWARE: download function uses current deployed identity contract
//truffle exec scripts/pointSocialImporter.js --download 0x61Db2E6aD1B19E94638d4C73fDe2ba3dE2498B9b 
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
    const migrationFile = '../resources/migrations/'+process.argv[6];
    return JSON.parse(fs.readFileSync(migrationFile));
}

async function download(contract) {
    const pointSocialArtifacts = artifacts.require('./PointSocial.sol');
    const artifact = artifacts.require('./Identity.sol');
    const identityContract = new web3.eth.Contract(artifact.abi, contract);
    const handle = 'pointsocial';

    const fileStructure = {posts:[]};

    const contractKey = await identityContract.methods.ikvList(handle, 0).call();
    const contractAddress = await identityContract.methods.ikvGet(handle, contractKey).call();
    const pointSocialContract = new web3.eth.Contract(pointSocialArtifacts.abi, contractAddress);
    const data = await pointSocialContract.methods.getAllPosts().call();
    const posts  = [];

    for (const item of data) {
        console.log(item);
        const {id, from, contents, image, createdAt} = item;
        console.log('Fetching post:' + id);

        const comments = await pointSocialContract.methods.getAllCommentsForPost(id).call();
        
        const post = {
            id, 
            from, 
            contents, 
            image, 
            createdAt,
            comments
        }

        posts.push(post);
    }

    fileStructure.posts = posts;

    const timestamp = Math.floor(Date.now() / 1000); 

    fs.writeFileSync(
        '../resources/migrations/' + timestamp + '-pointsocial.json', 
        JSON.stringify(fileStructure, null, 4)
    );

    console.log('Downloaded');
    exit(0);
}

async function upload(contract) {
    const migrationFile = '../resources/migrations/'+process.argv[6];
    
    if (!fs.existsSync(migrationFile)) {
        console.log('Migration not found');
        exit(0);
    }

    const pointSocialArtifacts = artifacts.require('./PointSocial.sol');
    const pointSocialContract = new web3.eth.Contract(pointSocialArtifacts.abi, contract);
    const accounts = await web3.eth.getAccounts();

    const data = JSON.parse(fs.readFileSync(migrationFile));

    await pointSocialContract.methods.addMigrator(accounts[0]).send({from:accounts[0]});

    let postComments = [];

    for (const post of data.posts) {
        console.log('Migrating: PointSocial post from ' + post.from + ' contents ' + post.contents);
    
        await pointSocialContract.methods.add(
            post.id,
            post.from, 
            post.contents, 
            post.image, 
            post.createdAt
        ).send({from: accounts[0]});
        
        postComments[post.id] = post.comments;
    }

    for (const postId in postComments){
        for(const comment of postComments[postId]) {
            const id = comment[0];
            const from = comment[1];
            const contents = comment[2];
            const createdAt = comment[3];
    
            console.log('Migrating: PointSocial comment post id:' + postId + ' from:' + from);
            await pointSocialContract.methods.addComment(
                id,
                postId, 
                from, 
                contents, 
                createdAt 
            ).send({from: accounts[0]});
        }
    }
    
    console.log('Done');
    exit(0);
}


// For truffle exec
module.exports = function(callback) {
    main().then(() => callback()).catch(err => callback(err));
};