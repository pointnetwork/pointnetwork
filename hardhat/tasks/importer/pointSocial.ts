import { task } from "hardhat/config";
import fs = require('fs');
import { BigNumber } from "ethers";

//npx hardhat pointsocial-importer upload 0xE6856F25deBdd7d2ccBEBF5d5750a7aD545251Dc --migration-file /Users/alexandremelo/.point/src/pointnetwork/resources/migrations/pointsocial-1647484455.json  --network ynet
//npx hardhat pointsocial-importer download 0x1411f3dC11D60595097b53eCa3202c34dbee0CdA --network ynet
//npx hardhat pointsocial-importer download 0x1411f3dC11D60595097b53eCa3202c34dbee0CdA --save-to /Users/alexandremelo/.point/src/pointnetwork/hardhat/  --network ynet

task("pointsocial-importer", "Will download and upload data to point  pointSocial contract")
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

    if(taskArgs.action == "download") {
        const zappHandle = 'pointsocial';

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
            const comments = await pointSocial.getAllCommentsForPost(id);
            
            const post = {
                id:id.toString(),
                from,
                contents,
                image,
                likesCount,
                createdAt,
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
                    
                    await pointSocial.add(
                        post.id,
                        post.from,
                        post.contents,
                        post.image,
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
                        const createdAt =  ethers.BigNumber.from(comment[3].hex);

                        console.log(`${lastProcessedComment} Migrating comment of post ${postId} from ${from}`);
            
                        await pointSocial.addComment(
                            id,
                            postId,
                            from,
                            contents,
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
            return false;
        }
    }
  });
