import { task } from "hardhat/config";
import fs = require('fs');
import fetch from "node-fetch";
import FormData from "form-data";
import * as https from 'https'
import mimeTypes from 'mime-types';
var detectContentType = require('detect-content-type');
var mimeDb = require("mime-db");

/**
 *    This task is intented to migrate Social point data between environments/versions downloading the smartcontract data offline to the specified directory
 * 
 *    Usage:
 *    To download the contract data from ynet using a local node, execute the following command in the hardhat folder:
 *          
 *          export POINT_NODE=localhost
 *          export POINT_NODE_PORT=8666
 *          npx hardhat social-migrator download $(cat ../config/default.yaml | grep "identity_contract_address" | awk '{ print $2 }' | sed -e 's/"//g') --network ynet
 *    
 *    This will create a pointsocial-XXXX-XX-XX.json, along with a folder named pointsocial-data-XXXX-XX-XX in the resources/migrations folder
 *  
 *    To upload the data to dev environment, use the folowing command:
 * 
 *          export POINT_NODE=localhost
 *          export POINT_NODE_PORT=65501
 *          npx hardhat social-migrator upload 0xD61e5eFcB183418E1f6e53D0605eed8167F90D4d --migration-file ../resources/migrations/pointsocial-DATE.json --network development
 * 
 */
 
const EMPTY = '0x0000000000000000000000000000000000000000000000000000000000000000';
const MIGRATION_DIR = '../resources/migrations/';

https.globalAgent.options.rejectUnauthorized = false;

type DataRequest = {
    data: string;
};

const download = async (id: string, type: string, path: string): Promise<boolean> => {
    try {
        if(id !== EMPTY){
            if (type === 'media') {

                const file = `${path}/media-${id}`;
                if (fs.existsSync(file)) {
                    console.log("Content already downloaded, aborting...");
                    return false;
                }

                console.log(`Downloading media: ${id}:`);
                const response = await fetch(`https://${process.env.POINT_NODE || 'localhost'}:${process.env.POINT_NODE_PORT || 8666}/_storage/${id}`);
                const buffer = await response.buffer()
                
                const contentType = detectContentType(buffer);
                if(contentType.toLowerCase().includes('javascript')) {
                    console.log('Javascript found, returning zero');
                    return false;
                }

                console.log(contentType);

                if (fs.existsSync(file)) {
                    const stats = fs.statSync(file);
                    //TODO: check the reliability of this method
                    if (buffer.byteLength === stats.size) {
                        console.log("Content already downloaded, aborting...");
                        return false;
                    }
                    else {
                        console.log(`Content size mismatch between ${buffer.byteLength} bytes vs ${stats.size} bytes, proceeding to download`);
                    }
                }

                fs.writeFileSync(file, buffer);
                console.log(`Media saved to ${file}`);

            } else { 

                const file = `${path}/text-${id}`;
                if (fs.existsSync(file)) {
                    console.log("Text already downloaded, aborting...");
                    return false;
                }

                console.log(`Downloading content: ${id}:`);
                const response = await fetch(`https://${process.env.POINT_NODE || 'localhost'}:${process.env.POINT_NODE_PORT || 8666}/v1/api/storage/getString/${id}`);
                if(response.ok) {
                    const json = await response.json() as DataRequest;
                    const str = json.data;

                    if (fs.existsSync(file)) {
                        const stats = fs.statSync(file);
                        //TODO: check the reliability of this method
                        if (str.length === stats.size) {
                            console.log("Text already downloaded, aborting...");
                            return false;
                        }
                        else {
                            console.log(`Content size mismatch between ${str.length} bytes vs ${stats.size} bytes, proceeding to download`);
                        }
                    }
    
                    fs.writeFileSync(file, str);
                    console.log(`Text saved to ${file}`);

                } else {
                    console.log(`Could not retrieve the id ${id} from getString`);
                    console.log(response);
                    return false;
                }
            }
            return true;            
        } else {
            return false;
        }
    }catch(error){
        console.log(error);
        return false;
    }
}


const upload = async (id: string, type: string, path: string): Promise<string> => {
    try {
        if(id !== EMPTY) {
            if (type === 'media') {
                const file = `${path}/media-${id}`;
                if (fs.existsSync(file)) {
                    const formData = new FormData();
                    formData.append("file", fs.createReadStream(file));
                    const response = await fetch(`https://${process.env.POINT_NODE || 'localhost'}:${process.env.POINT_NODE_PORT || 65501}/_storage/`, {
                        method: 'POST',
                        body: formData
                    });

                    if (response.ok) {
                        console.log('File upload success')
                        const json = await response.json() as DataRequest;
                        const storageId = json.data;
                        console.log('storage Id = ' + storageId);
                        return '0x' + storageId.toString();
                    } else{
                        console.log("File upload failure");
                        console.log(response);
                        throw new Error("Failed to upload file to arlocal. id = " + id);
                    }
                }
                else {
                    console.log("File not found");
                    return EMPTY;
                }
            }
            else {
                const file = `${path}/text-${id}`;
                if (fs.existsSync(file)) {

                    const str = fs.readFileSync(file, {encoding:'utf8'});

                    const response = await fetch(`https://${process.env.POINT_NODE || 'localhost'}:${process.env.POINT_NODE_PORT || 65501}/v1/api/storage/putString`, {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            data: str
                        })
                    });

                    if (response.ok) {
                        console.log('ok')
                        let json = await response.json() as DataRequest;
                        const storageId = json.data;
                        console.log('storage Id = ' + storageId);
                        return '0x' + storageId.toString();
                    }else{
                        console.log("File upload failure");
                        console.log(response);
                        throw new Error("Failed to upload file to arlocal. id = " + id);
                    }
                }
                else {
                    console.log("File not found");
                    return EMPTY;
                }
            }
        }
        else {
            return EMPTY;
        }
    }
    catch(error) {
        console.log(error);
    }
    return EMPTY;
}

const getContract = async (ethers:any, identityAddress:string, appHandle:string) : Promise<any> => {
    const identity = await ethers.getContractAt("Identity", identityAddress);
    const contractKey = await identity.ikvList(appHandle, 0);
    const contractAddress = await identity.ikvGet(appHandle, contractKey);
    const abiKey = await identity.ikvList(appHandle, 1);
    const contractAbi = await identity.ikvGet(appHandle, abiKey);
    https.globalAgent.options.rejectUnauthorized = false;
    const result = await fetch(`https://${process.env.POINT_NODE || 'localhost'}:${process.env.POINT_NODE_PORT || 8666}/_storage/0x${contractAbi}`);        
    const abi = (await result.json()).abi;
    const instance = (await ethers.getContractAt(abi, contractAddress)) as any;
    return { instance, contractAddress};
}

task("social-migrator", "Will download and upload data to pointSocial contract")
  .addPositionalParam("action", 'Use with "download" and "upload options"')
  .addPositionalParam("contract","Identity contract source address")
  .addOptionalParam("saveTo", "Saves migration file to specific directory")
  .addOptionalParam("migrationFile", "Migration file to when uploading data")
  .addOptionalParam("fromPort", "Port of point node to download data")
  .addOptionalParam("toPort", "Port of point node to upload data")
  .setAction(async (taskArgs, hre) => {
    const ethers = hre.ethers;
    const zappHandle = 'social';
    if(!ethers.utils.isAddress(taskArgs.contract)) {
        console.log('Contract address not valid.');
        return false;
    }

    let migrationFolder = '../resources/migrations/';

    if(taskArgs.saveTo != undefined) {
        migrationFolder = taskArgs.saveTo;
    }

    if(taskArgs.action == "download") {

        const fileStructure = {
            posts: []
        } as any;

        const { instance: pointSocial, contractAddress } = await getContract(ethers, taskArgs.contract, zappHandle);

        const data = await pointSocial.getAllPosts();
        const posts  = [];

        if(data.length == 0) {
            console.log('No posts found.');
            return false;
        }

        console.log(`Found ${data.length} articles`);

        for (const item of data) {
            const {id, from, contents, image, likesCount, createdAt} = item;

            console.log('Fetching post:' + id);
            const commentsRaw = await pointSocial.getAllCommentsForPost(id);
            // convert last element of comments array (timestamp) to string
            const comments = commentsRaw.map((c:any) => [c[0].toString(), c[1], c[2], c[3].toString()]);

            const post = {
                id:id.toString(),
                from,
                contents,
                image,
                likesCount,
                createdAt:createdAt.toString(),
                comments
            };

            posts.push(post);
        }

        fileStructure.posts = posts;

        const timestamp = new Date().toISOString().split("T")[0];
        const filename =  `pointsocial-${timestamp}.json`;

        const directory = `${migrationFolder}/pointsocial-${timestamp}-data`;
        if (!fs.existsSync(directory)){
            fs.mkdirSync(directory);
        }

        fs.writeFileSync(migrationFolder + filename, JSON.stringify(fileStructure, null, 4));

        for (const post of posts) {
            console.log(`Downloading content for post ${post.id}`);
            if (post.contents !== EMPTY) {
                console.log("Text:");
                const result = await download(post.contents, 'content', directory);
                console.log((result)?"OK":"NO");                
            }
            if (post.image !== EMPTY) {
                console.log("Media:");
                const result = await download(post.image, 'media', directory);
                console.log((result)?"OK":"NO");                
            }
            console.log(`Downloading comments for post ${post.id}`);
            for (const comment of post.comments) {
                console.log(`Comment id: ${comment[0]}`);
                if (comment[2] !== EMPTY) {
                    const result = await download(comment[2], 'content', directory);
                    console.log((result)?"OK":"NO");                    
                }
            }
        }

        console.log('Download complete!');
    }
    if(taskArgs.action == "upload") {

        const lockFilePath = '../resources/migrations/pointsocial-lock.json';

        if(taskArgs.migrationFile === undefined) {
            console.log('Please inform the migration file with `--migration-file /path/to/file.json`');
            return false;
        }

        const directory = taskArgs.migrationFile.replace(".json", "-data");

        if (!fs.existsSync(taskArgs.migrationFile)) {
            console.log(`File does not exists: ${taskArgs.migrationFile}`);
            return false;
        }

        if (!fs.existsSync(directory)) {
            console.log(`Directory does not exists: ${directory}`);
            return false;
        }

        const data = JSON.parse(fs.readFileSync(taskArgs.migrationFile).toString());

        let processCommentsFrom = 0;
        let processPostsFrom = 0;
        let lastProcessedPost = 0;
        let lastProcessedComment = 0;
        let foundLockFile = false;

        const { instance: pointSocial, contractAddress } = await getContract(ethers, taskArgs.contract, zappHandle);

        const [owner] = await ethers.getSigners();

        const lockFileStructure = {
            contract:contractAddress.toString(),
            migrationFilePath:taskArgs.migrationFile.toString(),
            lastProcessedPost:0,
            lastProcessedComment:0
        } as any;

        try{
            console.log('Trying to add migrator');
            await pointSocial.addMigrator(owner.address);
        } catch(error) {
            console.log("Error trying to add migrator, migrator is already set?");
        }

        if (!fs.existsSync(lockFilePath)) {
            console.log(`Lockfile not found, adding migrator ${owner.address}`);
        }else{
            const lockFile = JSON.parse(fs.readFileSync(lockFilePath).toString());
            if (lockFile.migrationFilePath == taskArgs.migrationFile.toString() &&
                lockFile.contract == contractAddress) {
                console.log('Previous lock file found');
                foundLockFile = true;
                processPostsFrom = lockFile.lastProcessedPost;
                processCommentsFrom = lockFile.lastProcessedComment;
            }
        }

        try {
            console.log(`found ${data.posts.length}`);
            const postComments = [];

            for (const post of data.posts) {
                postComments[post.id] = post.comments;
                lastProcessedPost++;
                if(lastProcessedPost > processPostsFrom || processPostsFrom == 0){
                   console.log(`${lastProcessedPost} Migrating: PointSocial post from ${post.from} contents ${post.contents}`);
                    
                    const importedContents = await upload(post.contents, 'content', directory);
                    const importedImage = await upload(post.image, 'media', directory);

                    await pointSocial.add(
                        post.id,
                        post.from,
                        importedContents,
                        importedImage,
                        post.likesCount,
                        post.createdAt
                    );
                }else{
                    console.log(`Skipping migrated post from ${post.from}`);
                }
            }

            for (const postId in postComments){
                for (const comment of postComments[postId]) {
                    lastProcessedComment++;
                    if(lastProcessedComment > processCommentsFrom || processCommentsFrom == 0){
                        const id = comment[0];
                        const from = comment[1];
                        const contents = comment[2];
                        const createdAt =  comment[3];

                        console.log(`${lastProcessedComment} Migrating comment of post ${postId} from ${from}`);

                        const importedContents = await upload(contents, 'content', directory);

                        await pointSocial.addComment(
                            id,
                            postId,
                            from,
                            importedContents,
                            createdAt
                        );
                    } else {
                        console.log(`Skipping migrated comment from ${postId}`);
                    }
                }
            }

            if(fs.existsSync(lockFilePath)) {
                fs.unlinkSync(lockFilePath);
            }

            console.log('Everything processed and uploaded, lock file removed.');

        }
        catch(error) {
            lockFileStructure.lastProcessedPost = lastProcessedPost;
            lockFileStructure.lastProcessedComment = lastProcessedComment;
            fs.writeFileSync(lockFilePath, JSON.stringify(lockFileStructure, null, 4));
            console.log(`Error on PointSocial import restart the process to pick-up from last processed item.`);
            console.log(error);
            return false;
        }

    }

  });
