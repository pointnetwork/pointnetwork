const seedOrPhrase = process.argv[2] || require(
    require('path').resolve(__dirname, '..', 'resources', 'blockchain-test-key.json')
).phrase;

const ethereum = require('ethereumjs-wallet');
const wallet = /^(0x)?[a-fA-F0-9]{64}$/.test(seedOrPhrase)
    ? ethereum.default.fromPrivateKey(Buffer.from(seedOrPhrase, 'hex'))
    : ethereum.hdkey.fromMasterSeed(require('bip39').mnemonicToSeedSync(seedOrPhrase)).getWallet();

console.log({
    privateKey: wallet.getPrivateKey().toString('hex'),
    publicKey: wallet.getPublicKey().toString('hex'),
    address: `0x${wallet.getAddress().toString('hex')}`
});
