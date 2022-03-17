import { task } from "hardhat/config";
import fs = require('fs');
import { BigNumber } from "ethers";


//npx hardhat blog-importer upload 0x86118C8C26f9a22CB52289B84f431F767bea1656 --migration-file /Users/alexandremelo/.point/src/pointnetwork/resources/migrations/blog-1647479501.json  --network ynet
//npx hardhat blog-importer download 0x1411f3dC11D60595097b53eCa3202c34dbee0CdA --network ynet
//npx hardhat blog-importer download 0x1411f3dC11D60595097b53eCa3202c34dbee0CdA --save-to /Users/alexandremelo/.point/src/pointnetwork/hardhat/  --network ynet

task("blog-importer", "Will download and upload data to point blog contract")
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
        const zappHandle = 'blog';

        const fileStructure = {
            articles: []
        } as any;

        const identity = await hre.ethers.getContractAt("Identity", taskArgs.contract);
        const contractKey = await identity.ikvList(zappHandle, 0);
        const contractAddress = await identity.ikvGet(zappHandle, contractKey);
        const blog = await hre.ethers.getContractAt("Blog", contractAddress);
        const data = await blog.getArticles();

        const articles  = [];

        if(data.length == 0) {
            console.log('No articles found.');
            return false;
        }

        console.log(`Found ${data.length} articles`);

        for (const item of data) {
            const {id, author, title, contents, timestamp} = item;
    
            console.log('Fetching post:' + id);
            const comments = await blog.getCommentsByArticle(id);
            
            const article = {
                id:id.toString(),
                author,
                title,
                contents,
                timestamp,
                comments
            };
    
            articles.push(article);
        }

        fileStructure.articles = articles;

        const timestamp = Math.round(Number(new Date()) / 1000);
        const filename =  `blog-${timestamp}.json`;

        fs.writeFileSync(migrationFolder + filename, JSON.stringify(fileStructure, null, 4));
        console.log('Downloaded');
    }else{
        const lockFilePath = '../resources/migrations/blog-lock.json';

        if(taskArgs.migrationFile === undefined) {
            console.log('Please inform the migration file with `--migration-file /path/to/file.json`');
            return false;
        }

        const data = JSON.parse(fs.readFileSync(taskArgs.migrationFile).toString());
    
        let processCommentsFrom = 0;
        let processArticlesFrom = 0;
        let lastProcessedArticle = 0;
        let lastProcessedComment = 0;
        let foundLockFile = false;

        const blog = await hre.ethers.getContractAt("Blog", taskArgs.contract);
	    const [owner] = await ethers.getSigners();
        const lockFileStructure = {
            contract:taskArgs.contract.toString(),
            migrationFilePath:taskArgs.migrationFile.toString(),
            lastProcessedArticle:0,
            lastProcessedComment:0
        } as any;

        try{
            console.log('Trying to add migrator');
            await blog.addMigrator(owner.address);
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
                processArticlesFrom = lockFile.lastProcessedArticle;
                processCommentsFrom = lockFile.lastProcessedComment;
            }
        }

        try {
            console.log(`found ${data.articles.length}`);
            const articleComments = [];

            for (const article of data.articles) {
                articleComments[article.id] = article.comments;
                lastProcessedArticle++;
                if(lastProcessedArticle > processArticlesFrom || processArticlesFrom == 0){
                   console.log(`${lastProcessedArticle} Migrating: Blog post from ${article.author} contents ${article.contents}`);
                    
                    await blog.add(
                        article.id,
                        article.author,
                        article.title,
                        article.contents,
                        article.timestamp
                    );
                }else{
                    console.log(`Skipping migrated article ${article.title}`);
                }
            }
        
            for (const postId in articleComments){
                for (const comment of articleComments[postId]) {
                    lastProcessedComment++;
                    if(lastProcessedComment > processCommentsFrom || processCommentsFrom == 0){
                        const author = comment[0];
                        const contents = comment[1];
                        const timestamp =  ethers.BigNumber.from(comment[2].hex);

                        console.log(`${lastProcessedComment} Migrating comment from article ${postId} from ${author}`);
            
                        await blog.addComment(
                            postId,
                            author,
                            contents,
                            timestamp
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
            lockFileStructure.lastProcessedArticle = lastProcessedArticle;
            lockFileStructure.lastProcessedComment = lastProcessedComment;
            fs.writeFileSync(lockFilePath, JSON.stringify(lockFileStructure, null, 4));
            console.log(`Error on Blog import restart the process to pick-up from last processed item.`);
            return false;
        }
    }
  });
