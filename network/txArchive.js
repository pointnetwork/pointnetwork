/*
Script collects specific data fields from each recorded transaction on the blockchain
and saves in a file on disk: /app/txArchiveFinal.json.

Script keeps a log of the last parsed block number so that it can be rerun without starting over
and saves this meta data on disk: /app/txArchiveMeta.json

Collected data fields are: blockNumber, hash, timestamp, from, to, value, input, fromIdentity, toIdentity, inputFn, inputVars
*/

const { readFileSync,
        writeFileSync,
        existsSync,
        createWriteStream,
        createReadStream} = require('fs');

let ownerToIdentity = {};
const txArchiveMetaFile = '/app/txArchiveMeta.json';
const txArchiveFinalFile= '/app/txArchiveFinal.json';
const txArchiveFile = '/app/txArchive.json';
const nodeConfigFile = '/data/config.json';

loadNodeConfig = () => {
    return JSON.parse(readFileSync(nodeConfigFile));
}

loadArchiveMeta = () => {
    // loads existing archive meta data and creates if not existing
    const defaultMetaJson = {
        'createdAt': Date.now(),
        'updatedAt': Date.now(),
        'networkId': config.network.web3_network_id,
        'latestParsedBlockNumber': 0,
    }

    if(!existsSync(txArchiveMetaFile)) {
        // create meta file
        console.log('Writing new archive meta file.');
        jsonStr = JSON.stringify(defaultMetaJson);
        writeFileSync(txArchiveMetaFile, jsonStr);
    }

    // read the existing file
    console.log('Reading existing archive meta file.')
    return JSON.parse(readFileSync(txArchiveMetaFile));
}

updateArchiveMeta = (latestParsedBlockNumber = 0) => {
    metaData = loadArchiveMeta();
    metaData.updatedAt = Date.now();
    metaData.latestParsedBlockNumber = latestParsedBlockNumber;
    jsonStr = JSON.stringify(metaData);

    writeFileSync(txArchiveMetaFile, jsonStr);
}

writeFinalTxArchive = () => {
    // copy to a new stream adding the surrounding array braces
    let wrt = createWriteStream(txArchiveFinalFile);
    let src = createReadStream(txArchiveFile);

    wrt.write('[')
    src.pipe(wrt, {end: false});
    src.on('end', () => {
        wrt.end(']');
    });
}

const config = loadNodeConfig();
const meta = loadArchiveMeta();

const identity_contract_address = config.network.identity_contract_address;
const storage_provider_registry_contract_address = config.network.storage_provider_registry_contract_address;
const Web3 = require('web3');
const Web3HttpProvider = require('web3-providers-http');
const host = process.env.BLOCKCHAIN_HOST || '127.0.0.1';
const port = process.env.BLOCKCHAIN_PORT || 7545;
const blockchainUrl = `http://${host}:${port}`
const httpProvider = new Web3HttpProvider(blockchainUrl, {keepAlive: true, timeout: 60000});
const web3 = new Web3(httpProvider);
const abiFileName = '/app/truffle/build/contracts/Identity.json';
const abiFile = JSON.parse(readFileSync(abiFileName));
const abi = abiFile.abi;
const identityInstance = new web3.eth.Contract(abi, identity_contract_address);

ownerToIdentity[identity_contract_address] = "Identity Contract";
ownerToIdentity[storage_provider_registry_contract_address] = "Storage Provider Registry Contract";

const LOAD_BLOCKCHAIN = true;

if(LOAD_BLOCKCHAIN) {
    (async () => {
        // load Identity contract and get all the identity mappings
        for (var i = 0; i <= 1; i++) {
            const handle = await identityInstance.methods.identityList(i).call();
            const owner = await identityInstance.methods.getOwnerByIdentity(handle).call();
            ownerToIdentity[owner] = handle;

            // Get ikvs starting with 'zweb/contracts/address/' and map the address to the name
            try{
                const contractKey = await identityInstance.methods.ikvList(handle, 0).call();
                console.log(contractKey);
                if(contractKey.startsWith('zweb/contracts/address')) {
                    // the owner deployed a contract so we add to the mapping
                    const contractName = contractKey.replace('zweb/contracts/address/', '');
                    const contractAddress = await identityInstance.methods.ikvGet(handle, contractKey).call();
                    ownerToIdentity[contractAddress] = contractName + ' Contract';
                }
            } catch (e) {
                // console.log('VM Revert: ', e.message);
            }
        }

        console.log('ownerToIdentity: ', ownerToIdentity);

        const latestBlock = await web3.eth.getBlock('latest');
        const txArchiveFileExists = existsSync(txArchiveFile);
        const endBlockNumber = latestBlock.number;
        const stream = createWriteStream(txArchiveFile, {flags:'a'});

        console.log('start block number: ', meta.latestParsedBlockNumber);
        console.log('end block number: ', endBlockNumber);

        // Just append to the txArchiveStreamFile
        let sep = ""
        if (txArchiveFileExists) { sep = ",\n" }

        for (let i = meta.latestParsedBlockNumber; i <= endBlockNumber; i++) {
            let block = await web3.eth.getBlock(i);
            if (block != null && block.transactions != null) {
                for(let j = 0; j <= block.transactions.length-1; j++) {
                    const hash = block.transactions[j];
                    const txObj = await web3.eth.getTransaction(hash);
                    const tx = (({ blockNumber, hash, from, to, value, input }) => ({ blockNumber, hash, from, to, value, input }))(txObj);
                    tx.timestamp = block.timestamp;
                    tx.fromIdentity = ownerToIdentity[tx.from];
                    tx.toIdentity = ownerToIdentity[tx.to];

                    // TODO: inputFn, inputVars
                    // console.log(tx.hash);
                    txJsonStr = JSON.stringify(tx);

                    stream.write(sep + txJsonStr);
                    if (!sep) { sep = ",\n" };
                }
            }
        }
        stream.end();

        writeFinalTxArchive();

        updateArchiveMeta(endBlockNumber);
    })()
}