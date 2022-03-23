#!/usr/bin/env node

const {writeFileSync} = require('fs');
const {resolve} = require('path');
const {generateMnemonic} = require('bip39');
const {getKeyFromMnemonic} = require('arweave-mnemonic-keys');
(async () => {
    const phrase = generateMnemonic();
    const arweaveKey = await getKeyFromMnemonic(phrase);
    const cwd = process.cwd();
    writeFileSync(resolve(cwd, process.argv[2], 'key-ynet.json'), JSON.stringify({phrase}));
    writeFileSync(resolve(cwd, process.argv[2], 'key-arweave.json'), JSON.stringify(arweaveKey));
    console.log('done.');
})();
