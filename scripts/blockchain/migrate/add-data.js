const { readFileSync } = require('fs');
const Web3 = require('web3');
const HDWalletProvider = require("@truffle/hdwallet-provider");
const blockchainUrl = process.env.BLOCKCHAIN_URL;
const pointNodePath = '/app'
const nodeConfigFile = `${process.env.DATADIR}/config.json`;
const Web3HttpProvider = require('web3-providers-http');

const mnemonic = require('/data/keystore/key.json');
const { exit } = require('process');
if (typeof mnemonic !== 'object' || !('phrase' in mnemonic)) {
    throw new Error('Invalid key format');
}
const httpProvider = new Web3HttpProvider(blockchainUrl, {keepAlive: true, timeout: 60000});
const privateKeyProvider = new HDWalletProvider({mnemonic, providerOrUrl: httpProvider});
const privateKey = `0x${privateKeyProvider.hdwallet._hdkey._privateKey.toString('hex')}`;
const hdWalletProvider = new HDWalletProvider({privateKeys: [privateKey], providerOrUrl: blockchainUrl});
const web3 = new Web3(hdWalletProvider);
const account = web3.eth.accounts.privateKeyToAccount(privateKey);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;


let config;
let identity_contract_address;

const allowedSites = {
    "twitter.z": {
        "abi":`${pointNodePath}/scripts/blockchain/migrate/abis/TwitterMigrations.json`,
        "contract":"0x9EF1BEcF1e63BAB97F883bA3C5fDf8f761eD41F8",
        "handle":"twitter",
    }, 
    "blog.z": {
        "abi":`${pointNodePath}/scripts/blockchain/migrate/abis/BlogMigrations.json`,
        "contract":"0x506d6A079856A6EF444c99dAef1bf15fcbc37bbb",
        "handle":"blog",
    }, 
    "pointsocial.z": {
        "abi":`${pointNodePath}/scripts/blockchain/migrate/abis/PointSocialMigrations.json`,
        "contract":"0x59BDA94F762c9227cC426Ea29C0aC1c196f1d7b6",
        "handle":"pointsocial",
    }, 
}

const minimal_contract_abi = [
    {
        "inputs":[
           {
              "internalType":"address",
              "name":"migrator",
              "type":"address"
           }
        ],
        "name":"addMigrator",
        "outputs":[],
        "stateMutability":"nonpayable",
        "type":"function"
     }
]


/*
if(process.argv[2] === undefined){
    let sites = Array.from(allowedSites.keys()).join(', ');
    console.log(`Please inform one of the website to migrate data eg: (${sites})`);
    return;
}*/

const site = process.argv[2];

init = () => {
    config = loadNodeConfig();
    identity_contract_address = config.network.identity_contract_address;
    storage_provider_registry_contract_address = config.network.storage_provider_registry_contract_address;

    startMigration();
}

startMigration = async() => {
    console.log('Migrating');    

    const identityAbiFile = loadIdentityAbi();
    const identityInstance = new web3.eth.Contract(identityAbiFile.abi, identity_contract_address);
    const handle = allowedSites[site].handle;
    const migrationAddress = allowedSites[site].contract;
    const migrationgAbi = loadSiteMigrationsAbi(allowedSites[site].abi);
    const contractKey = await identityInstance.methods.ikvList(handle, 0).call();
    const contractAddress = await identityInstance.methods.ikvGet(handle, contractKey).call();
    const siteInstance = new web3.eth.Contract(minimal_contract_abi, contractAddress);
    const migratorInstance = new web3.eth.Contract(migrationgAbi, migrationAddress);
    const account = web3.eth.defaultAccount;

    /*
    await siteInstance.methods.addMigrator(siteAddress).send(
    {
        from: account,
        gas:200000
    });
    */
    console.log('Migrator added');    

    await migratorInstance.methods.migrate(contractAddress).send(
    {
        from: account,
        gas:200000
    });
    console.log('Migrated');    

    exit(0);
}

loadNodeConfig = () => {
    return JSON.parse(readFileSync(nodeConfigFile));
}

loadIdentityAbi = () => {
    const abiFileName = `${pointNodePath}/truffle/build/contracts/Identity.json`;
    return JSON.parse(readFileSync(abiFileName));
}

loadSiteMigrationsAbi = (migrationAbi) => {
    return JSON.parse(readFileSync(migrationAbi));
}

init();
