const {generateMnemonic, mnemonicToSeed} = require('bip39');
const {hdkey} = require('ethereumjs-wallet');
const {get} = require('axios');

const generateAddress = async () => {
    const phrase = generateMnemonic();
    const seed = await mnemonicToSeed(phrase);
    const wallet = hdkey.fromMasterSeed(seed).getWallet();
    return wallet.getAddress().toString('hex');
};

(async () => {
    const numberOfRequests = Number(process.argv[2]);
    if (!numberOfRequests || isNaN(numberOfRequests)) {
        throw new Error('Bad arguments');
    }
    const addresses = await Promise.all(
        new Array(numberOfRequests).fill(null).map(() => generateAddress())
    );

    console.log(`Testing faucet with simultaneous ${numberOfRequests} requests`);

    let successCount = 0;
    let failCount = 0;

    await Promise.all(addresses.map(async address => {
        try {
            await get(`https://point-faucet.herokuapp.com/airdrop?address=0x${address}`);
            successCount++;
        } catch (e) {
            console.error(e.message);
            failCount++;
        }
    }));
    
    console.log(`Faucet test completed, success count: ${successCount}, fail count: ${failCount}`);
})();
