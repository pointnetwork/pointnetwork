const wallet = require('ethereumjs-wallet').hdkey.fromMasterSeed(
    require('bip39').mnemonicToSeedSync(require(
        require('path').resolve(__dirname, '..', 'resources', 'blockchain-test-key.json')).phrase
    )
).getWallet();

console.log({
    privateKey: wallet.getPrivateKey().toString('hex'),
    publicKey: wallet.getPublicKey().toString('hex'),
    address: `0x${wallet.getAddress().toString('hex')}`
});