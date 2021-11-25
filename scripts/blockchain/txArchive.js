/*
Script collects specific data fields from each recorded transaction on the blockchain
and saves in a file on disk: /data/blockchain/txArchiveFinal.json.

Script keeps a log of the last parsed block number so that it can be rerun without starting over
and saves this meta data on disk: /data/blockchain/txArchiveMeta.json

Collected data fields are: blockNumber, hash, timestamp, from, to, value, input, fromIdentity, toIdentity, inputFn, inputVars

TESTING:

    To reset remove the meta file like so `rm /data/blockchain/txArchive*.json` or completely delete the folder (BACKUP FIRST if you need to!) `rm -rf /data/blockchain/`
    To test from - to specific blocks set consts `DEFAULT_START_BLOCK` and `DEFAULT_END_BLOCK` (see below)
    To run the script first add a mount to the script folder in the docker-compose you are using. Then start the container and enter a session and run `node scripts/blockchain/txArchive.js` from within the container shell.

*/

const { readFileSync,
        writeFileSync,
        copyFileSync,
        existsSync,
        createWriteStream,
        createReadStream,
        mkdirSync} = require('fs');

const txArchiveDir = `${process.env.DATADIR}/blockchain`;

let ownerToIdentity = {};
let functionSelectorToName = {};
let config;
let meta;
const txArchiveMetaFile = `${txArchiveDir}/txArchiveMeta.json`;
const txArchiveFinalFile= `${txArchiveDir}/txArchiveFinal.json`;
const txArchiveFile = `${txArchiveDir}/txArchive.json`;
const nodeConfigFile = `${process.env.DATADIR}/config.json`;

/*
change DEFAULT_START_BLOCK & DEFAULT_END_BLOCK for manual testing
set to any integer value within the current avilable block range
NOTE setting both to 'undefined' will use 'meta.latestParsedBlockNumber +1 <-to-> latest block' (see function below)
*/
const DEFAULT_START_BLOCK = undefined;
const DEFAULT_END_BLOCK = undefined;

init = () => {
    // create the txArchiveDir directory if needed
    if (!existsSync(txArchiveDir)) {
        mkdirSync(txArchiveDir);
        console.log(`Directory ${txArchiveDir} created.`);
    }

    // backup exisisting files, just in case!
    let ts = Date.now();
    if (existsSync(txArchiveMetaFile)) { copyFileSync(txArchiveMetaFile, `${txArchiveMetaFile}-${ts}`); }
    if (existsSync(txArchiveFinalFile)) { copyFileSync(txArchiveFinalFile, `${txArchiveFinalFile}-${ts}`); }
    if (existsSync(txArchiveFile)) { copyFileSync(txArchiveFile, `${txArchiveFile}-${ts}`); }

    config = loadNodeConfig();
    meta = loadArchiveMeta();
}

loadNodeConfig = () => {
    return JSON.parse(readFileSync(nodeConfigFile));
}

loadArchiveMeta = () => {
    // loads existing archive meta data and creates if not existing
    const defaultMetaJson = {
        'createdAt': Date.now(),
        'updatedAt': Date.now(),
        'networkId': config.network.web3_network_id,
        'latestParsedBlockNumber': DEFAULT_START_BLOCK || -1,
    }

    if(!existsSync(txArchiveMetaFile)) {
        // create meta file
        console.log('Writing new archive meta file.');
        jsonStr = JSON.stringify(defaultMetaJson);
        writeFileSync(txArchiveMetaFile, jsonStr);
    }

    // read the existing file
    console.log('Reading existing archive meta file.');
    return JSON.parse(readFileSync(txArchiveMetaFile));
}

updateArchiveMeta = (latestParsedBlockNumber = 0) => {
    metaData = loadArchiveMeta();
    metaData.updatedAt = Date.now();
    metaData.latestParsedBlockNumber = latestParsedBlockNumber;
    jsonStr = JSON.stringify(metaData);

    writeFileSync(txArchiveMetaFile, jsonStr);
    console.log('Updated metaData: ', metaData);
}

writeFinalTxArchive = () => {
    // copy to a new stream adding the surrounding array braces
    let wrt = createWriteStream(txArchiveFinalFile);
    let src = createReadStream(txArchiveFile);

    wrt.write('[');
    src.pipe(wrt, {end: false});
    src.on('end', () => {
        wrt.end(']');
    });
}

loadIdentityAbi = () => {
    const abiFileName = '/app/truffle/build/contracts/Identity.json';
    return JSON.parse(readFileSync(abiFileName));
}

loadFnSelectorToName = () => {
    const abiFile = loadIdentityAbi();
    const methodIdentifiers = abiFile.evm.methodIdentifiers;

    for(method in methodIdentifiers){
        functionSelectorToName[`0x${methodIdentifiers[method]}`] = method;
    }

    console.log('loaded functionSelectorToName: ', functionSelectorToName);
}

loadOwnerToIdentityMapping = async () => {
    // load Identity contract and get all the identity mappings
    const abiFile = loadIdentityAbi();
    const abi = abiFile.abi;
    const identityInstance = new web3.eth.Contract(abi, identity_contract_address);
    let identityIndex = 0;

    while(true) {
        try{
            const handle = await identityInstance.methods.identityList(identityIndex).call();
            const owner = await identityInstance.methods.getOwnerByIdentity(handle).call();
            ownerToIdentity[owner] = handle;
            identityIndex++;
            // Get ikvs starting with 'zweb/contracts/address/' and map the address to the name
            try{
                // assuming that the contract address is the first key in the ikvList
                const contractKey = await identityInstance.methods.ikvList(handle, 0).call();
                if(contractKey.startsWith('zweb/contracts/address')) {
                    // the owner deployed a contract so we add to the mapping
                    const contractName = contractKey.replace('zweb/contracts/address/', '');
                    const contractAddress = await identityInstance.methods.ikvGet(handle, contractKey).call();
                    ownerToIdentity[contractAddress] = contractName + ' Contract';
                }
            } catch (e) {
                console.log(`Identity ${handle} has not deployed a contract.`);
            }
        }
        catch(e) {
            console.log('All registered Identities loaded');
            break;
        }
    }

    ownerToIdentity[identity_contract_address] = "Identity Contract";
    ownerToIdentity[storage_provider_registry_contract_address] = "Storage Provider Registry Contract";

    console.log('loaded ownerToIdentity: ', ownerToIdentity);
}

cleanup = () => {
    stream.end();

    let latestParsedBlockNumber = currentBlockNumber - 1;

    updateArchiveMeta(latestParsedBlockNumber);
}

exitHandler = (options, exitCode) => {
    console.log('App is exiting. Time to clean up! Current Block Number: ', currentBlockNumber);

    cleanup();

    process.exit();
}

/* initialize */
init();

const identity_contract_address = config.network.identity_contract_address;
const storage_provider_registry_contract_address = config.network.storage_provider_registry_contract_address;
const Web3 = require('web3');
const Web3HttpProvider = require('web3-providers-http');
const blockchainUrl = process.env.BLOCKCHAIN_URL;
const httpProvider = new Web3HttpProvider(blockchainUrl, {keepAlive: true, timeout: 60000});
const web3 = new Web3(httpProvider);
const stream = createWriteStream(txArchiveFile, {flags:'a'});

let currentBlockNumber;

const PARSE_BLOCKCHAIN = true;

// make sure meta data is updated if the process is stopped for some reason
[`SIGINT`, `SIGUSR1`, `SIGUSR2`, `SIGTERM`].forEach((eventType) => {
    process.on(eventType, exitHandler.bind(null, eventType));
})

/* Actual Blockchain parsing performed below */
if(PARSE_BLOCKCHAIN) {
    (async () => {
        await loadOwnerToIdentityMapping(); // populates ownerToIdentity
        loadFnSelectorToName(); // populates functionSelectorToName

        const latestBlock = await web3.eth.getBlock('latest');
        const txArchiveFileExists = existsSync(txArchiveFile);
        // Note: DEFAULT_START_BLOCK & DEFAULT_END_BLOCK are essentially used during development / testing
        // see const definitions and note at top of this script for details
        const endBlockNumber = DEFAULT_END_BLOCK || latestBlock.number;
        const startBlockNumber = DEFAULT_START_BLOCK || meta.latestParsedBlockNumber + 1;

        currentBlockNumber = startBlockNumber;

        console.log('start block number: ', startBlockNumber);
        console.log('end block number: ', endBlockNumber);

        // Just append to the txArchiveStreamFile
        let sep = "";

        if (txArchiveFileExists) { sep = ",\n" };

        try {
            for (currentBlockNumber; currentBlockNumber <= endBlockNumber; currentBlockNumber++) {
                // if(currentBlockNumber==505) {
                //     throw Error('Test Error!!');
                // }
                let block = await web3.eth.getBlock(currentBlockNumber);
                (currentBlockNumber % 1000 == 0) && console.log(`Reached block: ${currentBlockNumber} (remaining blocks ${endBlockNumber - currentBlockNumber})`);
                console.log('currentBlockNumber: ', currentBlockNumber);
                // console.log('Block: ', block);
                if (block != null && block.transactions != null) {
                    for(let j = 0; j <= block.transactions.length-1; j++) {
                        const hash = block.transactions[j];
                        // console.log('hash: ', hash);
                        console.log(`Block ${currentBlockNumber}: Transactions Count: ${block.transactions.length}`);
                        const txObj = await web3.eth.getTransaction(hash);
                        // console.log('txObj: ', txObj);
                        const tx = (({ blockNumber, hash, from, to, value, input }) => ({ blockNumber, hash, from, to, value, input }))(txObj);
                        tx.timestamp = block.timestamp;
                        tx.fromIdentity = ownerToIdentity[tx.from];
                        tx.toIdentity = ownerToIdentity[tx.to];
                        tx.inputFn = functionSelectorToName[tx.input.slice(0,10)];

                        // TODO: inputVars
                        txJsonStr = JSON.stringify(tx);

                        stream.write(sep + txJsonStr);
                        if (!sep) { sep = ",\n" };
                    }
                }
            }
        } catch (e) {
            console.log('ERROR: at block: ' + currentBlockNumber + ' :', e);
        } finally {
            writeFinalTxArchive();

            cleanup();
        }
    })()
}