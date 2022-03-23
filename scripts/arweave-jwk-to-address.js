#!/usr/bin/env node
require('arweave')
    .init()
    .wallets
    .jwkToAddress(require(require('path').resolve(process.cwd(), process.argv[2])))
    .then(console.log);
