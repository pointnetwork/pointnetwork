#!/usr/bin/env node

const {writeFileSync} = require('fs');
const {resolve} = require('path');
const {generateMnemonic} = require('bip39');
const {getKeyFromMnemonic} = require('arweave-mnemonic-keys');

(async () => {
    const phrase = generateMnemonic();
    const arweaveKey = await getKeyFromMnemonic(phrase);
    writeFileSync(resolve(__dirname, '..', 'key.json'), JSON.stringify({phrase}));
    writeFileSync(resolve(__dirname, '..', 'arweave.json'), JSON.stringify(arweaveKey));
    console.log('done.');
})();
