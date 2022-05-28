import { task } from "hardhat/config";
import fs = require('fs');
import fetch from "node-fetch";
import FormData from "form-data";
import * as https from 'https'
import mimeTypes from 'mime-types';
var detectContentType = require('detect-content-type');
var mimeDb = require("mime-db");


//npx hardhat pointsocial-importer upload POINTSOCIAL_CONTRACT --migration-file ../resources/migrations/pointsocial-TIMESTAMP.json --from-port 8666 --to-port 65501 --network ynet
//npx hardhat pointsocial-importer download 0x1411f3dC11D60595097b53eCa3202c34dbee0CdA --network ynet
//npx hardhat pointsocial-importer download 0x1411f3dC11D60595097b53eCa3202c34dbee0CdA --save-to ../resources/migrations/ --network ynet

task("pointsocial-importer", "Will download and upload data to point  pointSocial contract")
  .addPositionalParam("action", 'Use with "download" and "upload options"')
  .addPositionalParam("contract","Identity contract source address")
  .addOptionalParam("saveTo", "Saves migration file to specific directory")
  .addOptionalParam("migrationFile", "Migration file to when uploading data")
  .addOptionalParam("fromPort", "Port of point node to download data")
  .addOptionalParam("toPort", "Port of point node to upload data")
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

    if(taskArgs.action == "download") {
        const zappHandle = 'social';

        const fileStructure = {
            posts: []
        } as any;

        const identity = await hre.ethers.getContractAt("Identity", taskArgs.contract);
        const contractKey = await identity.ikvList(zappHandle, 0);
        const contractAddress = await identity.ikvGet(zappHandle, contractKey);
        const pointSocial = await hre.ethers.getContractAt("PointSocial", contractAddress);
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
            const comments = commentsRaw.map((c:any) => [c[0].toString(), c[1], c[2], c[3].toString()])

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

        const timestamp = Math.round(Number(new Date()) / 1000);
        const filename =  `pointsocial-${timestamp}.json`;

        fs.writeFileSync(migrationFolder + filename, JSON.stringify(fileStructure, null, 4));

        console.log('Downloaded');
    }else{
        if(taskArgs.fromPort == undefined || taskArgs.toPort == undefined){
            console.log("Undefined ports do donwload or upload arweave data, please set --from-port and --to-port parameters.");
            return false;
        }

        https.globalAgent.options.rejectUnauthorized = false;
        const importString = async (id: string, type: string): Promise<string> => {
            type DataRequest = {
                data: string;
            };
            try{
                console.log('importing type:' + type);
                if(id !== '0x0000000000000000000000000000000000000000000000000000000000000000'){
                    //Download the file using point node. 
                    let response;
                    if (type === 'image'){
                        response = await fetch(`https://localhost:${taskArgs.fromPort}/_storage/${id}`);
                        let buff = await response.buffer()
                        
                        const contentType = detectContentType(buff);
                        if(contentType.toLowerCase().includes('javascript')){
                            console.log('javascript found, returning zero');
                            return '0x0000000000000000000000000000000000000000000000000000000000000000';
                        }

                        const ext = mimeDb[contentType.toLowerCase()]?.extensions[0] ?? 'bin';
                        fs.writeFileSync(id + '.' + ext, buff);
                        console.log('file name = ' + id + '.' + ext);
                        const formData = new FormData();
                        formData.append("file", fs.createReadStream(id + '.' + ext));
                        response = await fetch(`https://localhost:${taskArgs.toPort}/_storage/`, {
                            method: 'POST',
                            body: formData
                        });
                        fs.unlinkSync(id + '.' + ext);
                    }else{
                        response = await fetch(`https://localhost:${taskArgs.fromPort}/v1/api/storage/getString/${id}`);
                        if(response.ok){
                            let json = await response.json() as DataRequest;
                            const str = json.data;
                            
                            response = await fetch(`https://localhost:${taskArgs.toPort}/v1/api/storage/putString`, {
                                method: 'POST',
                                headers: {
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    data: str
                                })
                            });
                        }else{
                            console.log(`could not retrieve the id = ${id} from getString`);
                            return '0x0000000000000000000000000000000000000000000000000000000000000000';
                        }
                    }
                    
                    if (response.ok) {
                        console.log('ok')
                        let json = await response.json() as DataRequest;
                        const newId = json.data;
                        console.log('new id = ' + newId)
                        return '0x' + newId.toString();
                    }else{
                        console.log("response not ok");
                        console.log(response);
                        throw new Error("Failed to upload file to arlocal. id = " + id);
                    }
                }else{
                    return id;
                }
            }catch(e){
                console.log('Error in importString, skipping to import ' + id);
                console.log(e);
                return '0x0000000000000000000000000000000000000000000000000000000000000000';
            }
        }

        const lockFilePath = '../resources/migrations/pointsocial-lock.json';

        if(taskArgs.migrationFile === undefined) {
            console.log('Please inform the migration file with `--migration-file /path/to/file.json`');
            return false;
        }

        const data = JSON.parse(fs.readFileSync(taskArgs.migrationFile).toString());

        let processCommentsFrom = 0;
        let processPostsFrom = 0;
        let lastProcessedPost = 0;
        let lastProcessedComment = 0;
        let foundLockFile = false;

        const pointSocial = await hre.ethers.getContractAt("PointSocial", taskArgs.contract);
	    const [owner] = await ethers.getSigners();
        const lockFileStructure = {
            contract:taskArgs.contract.toString(),
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
                lockFile.contract == taskArgs.contract.toString()) {
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
                    
                    const importedContents = await importString(post.contents, 'post-content');
                    const importedImage = await importString(post.image, 'image');

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

                        const importedContents = await importString(contents, 'comment');

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

        } catch (error) {
            lockFileStructure.lastProcessedPost = lastProcessedPost;
            lockFileStructure.lastProcessedComment = lastProcessedComment;
            fs.writeFileSync(lockFilePath, JSON.stringify(lockFileStructure, null, 4));
            console.log(`Error on PointSocial import restart the process to pick-up from last processed item.`);
            console.log(error);
            return false;
        }
    }
  });
