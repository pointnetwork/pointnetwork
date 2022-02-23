'use strict';

//truffle exec scripts/blogImporter.js <action> <contract> <migration_file>

//BEWARE: upload function uses target deployed blog contract
//truffle exec scripts/blogImporter.js --upload 0xa4C69e06Cdb629Cd20DC813517cb9a2f279cD0A7 1643656897-blog.json

//BEWARE: download function uses current deployed identity contract
//truffle exec scripts/blogImporter.js --download 0x61Db2E6aD1B19E94638d4C73fDe2ba3dE2498B9b
const fs = require('fs');
const {exit} = require('process');

//truffle exec scripts/blogImporter.js --upload 0xa4C69e06Cdb629Cd20DC813517cb9a2f279cD0A7 1643656897-blog.json --config truffle-config-neon.js --network ynet

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

async function download(contract) {
    const blogArtifacts = artifacts.require('./Blog.sol');
    const artifact = artifacts.require('./Identity.sol');
    const identityContract = new web3.eth.Contract(artifact.abi, contract);
    const handle = 'blog';

    const fileStructure = {articles:[]};

    const contractKey = await identityContract.methods.ikvList(handle, 0).call();
    const contractAddress = await identityContract.methods.ikvGet(handle, contractKey).call();
    const blogContract = new web3.eth.Contract(blogArtifacts.abi, contractAddress);
    const data = await blogContract.methods.getArticles().call();
    const articles  = [];

    for (const item of data) {
        const {id, author, title, contents, timestamp} = item;

        console.log('Fetching post:' + id);

        const comments = await blogContract.methods.getCommentsByArticle(id).call();

        const article = {
            id,
            author,
            title,
            contents,
            timestamp,
            comments
        };

        articles.push(article);
    }

    fileStructure.articles = articles;

    const timestamp = Math.floor(Date.now() / 1000);

    fs.writeFileSync(
        '../resources/migrations/' + timestamp + '-blog.json',
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

    const blogArtifacts = artifacts.require('./Blog.sol');
    const blogContract = new web3.eth.Contract(blogArtifacts.abi, contract);
    const accounts = await web3.eth.getAccounts();

    const data = JSON.parse(fs.readFileSync(migrationFile));

    // await blogContract.methods.addMigrator(accounts[0]).send({from:accounts[0]});

    const articleComments = [];

    for (const article of data.articles) {
        console.log('Migrating: Blog post from ' + article.author + ' contents ' + article.contents);

        await blogContract.methods.add(
            article.id,
            article.author,
            article.title,
            article.contents,
            article.timestamp
        ).send({from: accounts[0], gas: 6500000});

        articleComments[article.id] = article.comments;
    }

    for (const postId in articleComments){
        for(const comment of articleComments[postId]) {
            const author = comment[0];
            const contents = comment[1];
            const timestamp = comment[2];

            console.log('Migrating: Blog comment post id:' + postId + ' from:' + author);
            await blogContract.methods.addComment(
                postId,
                author,
                contents,
                timestamp
            ).send({from: accounts[0], gas: 6500000});
        }
    }

    console.log('Done');
    exit(0);
}

// For truffle exec
module.exports = function(callback) {
    main().then(() => callback()).catch(err => callback(err));
};