'use strict';

//command: truffle exec scripts/identityMigrator.js --config truffle-config-neon.js  --network ynet 

let migrationData = [
      {
        "handle":"twitter",
        "address":"0x314dF55775e0b6F2B0c6d07C7Ec83a3e1cdC165e",
        "pub_key_parts": {
            "part1": "0x6b6579636f6465686173680000000000000000000000000000000000000000",
            "part2": "0x6b6579636f6465686173680000000000000000000000000000000000000001"
        },
        "ikv" : {
            "zweb/contracts/address/Twitter" : "0xC4F4B9DCB6eAbF7C7E86D2c9C377ddca7e8b60a0",
            "zweb/contracts/abi/Twitter" : "03575fe9938f7bb2160d998eee3fecf3452f99917fe37e07189c7bf95bb04947",
            "::rootDir" : "95984d57d8064735ddcec9b06105072a841b844c8f7a0622857eb3b58e7e83d5",
            "zdns/routes" : "0x1782fd9de28bff7ed5fffffd702caa022c851d89f019d54e7706512a469a5d3a",
        }
    },
    {
        "handle":"finalanswer",
        "address":"0x68002708ECc34CcD490e1859Fa8652Ba9dDD29D6",
        "pub_key_parts": {
            "part1": "0xed17268897bbcb67127ed550cee2068a15fdb6f69097eebeb6e2ace46305d1ce",
            "part2": "0xe1e032c91d4c8fe6bab1f198871dbafb8842f073acff8ee9b822f748b180d7eb"
        }
    },
    {
        "handle":"ubuntutest",
        "address":"0x574318Fc15C6Db801dC4719D4f746acF79FfC3cf",
        "pub_key_parts": {
            "part1": "0x9d6b0f937680809a01639ad1ae4770241c7c8a0ded490d2f023669f18c6d744b",
            "part2": "0x5f04837d78fa7a656419f98d73fc1ddaac1bfdfca9a244a2ee128737a186da6e"
        }
    },
    {
        "handle":"Slothnado",
        "address":"0x2d5360AAb543E92efc40B438b813f0FD5fa64620",
        "pub_key_parts": {
            "part1": "0xdd5a0873f998fff6b00052b51d1662f2993b603d9837da33cbc281a06b9f3b55",
            "part2": "0x0090916c0e6846d5dc8d22560e90782ded96e4efdeb53db214f612a54d4f5fbe"
        }
    },
    {
        "handle":"Sina",
        "address":"0x8834C336ea54f164fE7D797B5aa2d0Cc65c3EF3a",
        "pub_key_parts": {
            "part1": "0x8aac7b9c9c31d9b49435ec249d97b15c2777b684cdecffbd095a932b17d4ec93",
            "part2": "0x3c7b3a492a09eb9dce7397ade8a19fa5c439ac7de85d7c610a2301cb4e59fef9"
        }
    },
    {
        "handle":"AnupamSingh",
        "address":"0xF003B0d9ABefd8B8Dea98a003802Baa60b69A09e",
        "pub_key_parts": {
            "part1": "0x2e65584b959c9debff200739fd2de23aa8637be7ae94321b31f0fe79a93e04d3",
            "part2": "0xe636e87a00af722667430e64005c4107ab615aa02d5391ef443a20ef6b7cc0c4"
        }
    },
    {
        "handle":"NitinKumar",
        "address":"0xb17315291626773aeb5F6B4B4d4FAaacf4B5bc6a",
        "pub_key_parts": {
            "part1": "0xd1e75edad42c6aa2e83bfafec5f00ffffc0e56236b7122007d03a6bf11288383",
            "part2": "0x18def7c947b87d227b52b153b30363c0cf437aac0d3cd647d4ff49d9966e7fe9"
        }
    },
    {
        "handle":"bnc",
        "address":"0xB183c65f61BE14C77e31079A685ddeDEfF9937Ad",
        "pub_key_parts": {
            "part1": "0xdda52315c2b57684ad3b720610b8fb549a990a315f5b3d7bbcdf1f07074b8428",
            "part2": "0xaeda6acd284734bf6de01a31c77339e5ce886639c10acb6f79ea01925e5ca3d5"
        }
    },
    {
        "handle":"Enaliel",
        "address":"0x8690481754AaFF7f6cC51EeA188a1903C5E451b4",
        "pub_key_parts": {
            "part1": "0x1c992a15cc1bc258d7e36613ad81f39034918684b8528f2a6abd21b2fdea181f",
            "part2": "0x08dcafa795c84720f746e24729a2c37821fc17de000d513adbc98b65fb45f9ad"
        }
    },
    {
        "handle":"ubuntutest2",
        "address":"0x651c21909Cfb2ceB5Bb6aa8fd8d7b62570CbcCa0",
        "pub_key_parts": {
            "part1": "0x5599aa288c2f86c62ba56e169abb63f4094a47ebf55b6fbd124312fedcfeceb2",
            "part2": "0xa4bb1a5e9d07961026af956446ee3754415c44c2ec0cddaac23ab1e456344b69"
        }
    },
    {
        "handle":"helloyoutube",
        "address":"0xAAe915e21d92f084756e5243E5F70E717451238B",
        "pub_key_parts": {
            "part1": "0xee539aef57658800bf11f0d575d20d5dcb5f5f8aa9bb006cabcfe414d421024a",
            "part2": "0xeb3e7c0ecd1489d8415dd0f6d9e0a287a82b2a59d13d6d4c5ef94710201d7e32"
        }
    },
    {
        "handle":"drodriguezavila8",
        "address":"0xEc8bAaaAf82170f06c6E7e937a7e37c1DAffA45c",
        "pub_key_parts": {
            "part1": "0x8a2b7a899f1d40c51db97401f0c88ee7680b2349b7a642a07266efa2af27f42e",
            "part2": "0xac741e60e0c8e4a234f8293b9f122c0a4e05548727239f0d9ad711689559e90e"
        }
    },
    {
        "handle":"C3jotarov",
        "address":"0x53a83acf5202C1a8dF60aA21f0695817aa850C5B",
        "pub_key_parts": {
            "part1": "0x5350566029011f3b56422bbe7a50ff5341ff7f1db738dff8a6aa9e76ea3b9348",
            "part2": "0xb2b787ee46f9f49abcc4e3cfe45db4c28ae04b1b5c13622a70f94ff5396bce04"
        }
    },
    {
        "handle":"testoct18n1",
        "address":"0xb3f46CF4C3aBDC952DCfd9270CeB9FF9CE0aDb9F",
        "pub_key_parts": {
            "part1": "0x239fa9b7ca2f4fead86def603502f83082831f88ab70d4302215200f927e8934",
            "part2": "0xe12732e0ddf4d0d00c184eb26bcd5a667401fad40f971453f4c0c4f73d7b127c"
        }
    },
    {
        "handle":"jensendarren",
        "address":"0x1F32b3Eb1AE217155C9d915f51079d14e562941e",
        "pub_key_parts": {
            "part1": "0xbd664b4c750a3fe8b07b7eb81dbeda3a16efe39e6ee8d1495d2f39074c2670fc",
            "part2": "0x2a778806ed733f3e56eb45111baa794cb08fffc92a126698f28a9ddda951901f"
        }
    },
    {
        "handle":"test5",
        "address":"0x973d0dBE97Acd4E313cd06D25f9321D01305fE87",
        "pub_key_parts": {
            "part1": "0x7535efe1d1ec66321545c43d2d706b9932ae416d145ba1c28f7adba3c77dbe2f",
            "part2": "0x70ab7d0ddf3d9acfcbb7e922f067fd1194d3efb3cbe4ebd68d7dbda19c60f208"
        }
    },
    {
        "handle":"arweavesam",
        "address":"0x64c4240e082879C7B8CC39a1bF0f7801321B18cA",
        "pub_key_parts": {
            "part1": "0x319cc3981837b7dc79c96cb66c6d42893d4ad8b048a1991b8d69ff63f874eee8",
            "part2": "0x807d620f9bc38865db1a33e803e78db2d449f082b40e7c98e542aab7377ec831"
        } 
    },
    {
        "handle":"ubuntoo",
        "address":"0x78C16aF63EA147c5Ca60604E5f4bFE2CE7c46c2A",
        "pub_key_parts": {
            "part1": "0xf81ff7a87654ded8572aff280debc450be2ba325f7e9783ef576f1611ced7822",
            "part2": "0x0da08adcae4da2ed5b2014830447e479671b5b93ec16e01da1edce389b4d475f"
        }
    },
    {
        "handle":"alex",
        "address":"0xB780b13D48DF86f123Ba09b58Fe9747B00E9babd",
        "pub_key_parts": {
            "part1": "0x8f50eef03fefbfd1bc3f27e8676e7855dc48f6b45517f2781ac4a76820c2fec1",
            "part2": "0xa80d4089a15f6db45c0192fc00d66e6008f0be71c143d8c5aa4ae37ab90603ca"
        }
    },
    {
        "handle":"meowmeow30",
        "address":"0x94B1293F8CEC91738D307cD88b8f7Df535cE3373",
        "pub_key_parts": {
            "part1": "0xd379e2176297bd3fe31f14c8866556fb25e00058ba04a003593ae48f89ada9c2",
            "part2": "0xa68ff790bab63c551d1b6c2cc7e13e62f89d098eb484bf46e9ce24fc83d176d1"
        }
    },
    {
        "handle":"anonymous",
        "address":"0x766b8860A5e6B4dC3d915734454238Cd5ec810e0",
        "pub_key_parts": {
            "part1": "0x19adc8bb761168fca046608caebe91d07f5b8bb86f1b243815f5a4be4c7991fd",
            "part2": "0x3bdade11c2872cbf22df6b41af7c6f21cefa6d9b0d8776e90939a27cff55733d"
        }
    },
    {
        "handle":"p4ul17",
        "address":"0xe235C8145894c1bA934B82b1C51F8Ccc6f344D72",
        "pub_key_parts": {
            "part1": "0x498c776b3dc033697a8f07f735179e34dd89b3ed7c62d90ede5df813f3d3da63",
            "part2": "0xfe98f7f0a93dba545caccd556cca24faf1cffc1f4da594885ea808c7d2dcd965"
        }
    },
    {
        "handle":"darwin",
        "address":"0xbFbb3E7A5A2d514ad7022bB56E8Ac354A6524BBb",
        "pub_key_parts": {
            "part1": "0x42914314df7585021dc6d65abc37602fce1332e8baf78778df997ff5c7026368",
            "part2": "0xfab79b79be2b4d8134ec86f03af36075c10777d15d1097787e7c2477598eba88"
        }
    },
    {
        "handle":"pemulis",
        "address":"0xCCb4D3509443B7b6Fe1e2c27FB61dC3D635E3088",
        "pub_key_parts": {
            "part1": "0x8a16715c38842e09a244864b4eccc87fbe925d955e33162321a83d31011465e0",
            "part2": "0xa2d643c928f807c7cbd5d725ca55ecfe15ef60397bc76acbe26883d843d8ed1e"
        }
    },
    {
        "handle":"NazdarKluku",
        "address":"0x6535DfCAe615068e58d3B96F85b72BD738234e02",
        "pub_key_parts": {
            "part1": "0xb927574077f2c427e8d338c3be057fd1fb013750ced713e80249c0733576f623",
            "part2": "0xa32d187c828923622750d218491a1dee01625f1526892d7e8644910aa5fb9a12"
        }
    },
    {
        "handle":"secondvm",
        "address":"0x54eD443839d09B064C5C16e6B199b99D955Bb1aA",
        "pub_key_parts": {
            "part1": "0xd1600842ce30f358e37684e709b9746f3d620f521a8b8abf67142934a319c20a",
            "part2": "0x0188db412a44b3f36c89491f143df2a5d5f0d5e1d8e5a1501667873fcbcd455b"
        }
    },
    {
        "handle":"demo",
        "address":"0xaD83f44e0D9B4013df24CDAD020bf6Eef98d9783",
        "pub_key_parts": {
            "part1": "0xb6d3e0cac9c0e218e49f9d7e5317ffe781330d92f14f67136d82be103615c1ee",
            "part2": "0x3f9e091ab195f9294b50438870d8a6e1b22b2d8911b18dda60714e059918a445"
        }
    }
];

global.artifacts = artifacts;
global.web3 = web3;


async function main(){
    const artifact = artifacts.require("./Identity.sol");
    const contract = new web3.eth.Contract(artifact.abi, artifact.address);

    const newtworkType = await web3.eth.net.getNetworkType();
    const networkId = await web3.eth.net.getId();
    let accounts = await web3.eth.getAccounts();

    console.log("network type:"+newtworkType);
    console.log("network id:"+networkId);
    console.log("Deployer account:"+accounts[0]);
    console.log("Contract address:"+artifact.address);

    //meh, because the version of web3 package we're using is old we need to use .call() twice.
    const migrationsApplied = await contract.methods.migrationApplied.call({from: accounts[0]}).call();

    if(!migrationsApplied) {
        try{
            for(let i in migrationData) {
                let identity = migrationData[i];
   
                console.log(`Applying migration for ${identity.handle}`)

                await contract.methods.register(
                        identity.handle,
                        identity.address, 
                        identity.pub_key_parts.part1, 
                        identity.pub_key_parts.part2
                    )
                .send({from: accounts[0]});

                if('ikv' in identity) {
                    for(let key in identity.ikv) {

                        let value = identity.ikv[key];

                        console.log(`Setting key-value data identity:@${identity.handle} > [key:${key} --- value:${value}]`)

                        await contract.methods.ikvMigrate(
                            identity.handle,
                            key,
                            value
                        )
                    .send({from: accounts[0]});
                    }
                } else {
                    console.log("No key value data to input");
                }
            }
        } catch (e) {
            if (err.code === 'ETIMEDOUT') {
                console.log('My dish error: ', util.inspect(err, { showHidden: true, depth: 2 }));
            }
        }

        await contract.methods.finishMigrations().send({from: accounts[0]});
        console.log('Migrations disabled');
        console.log('Successfully migrated');

    } else {
        console.log('Migrations already applied')
    }
}

// For truffle exec
module.exports = function(callback) {
    main().then(() => callback()).catch(err => callback(err))
};