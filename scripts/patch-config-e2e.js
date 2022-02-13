#!/usr/bin/env node

const {existsSync, writeFileSync, unlinkSync, mkdirSync} = require('fs');
const lockfiles = ['/data/point.pid', '/data/data/db/LOCK'];

for (const lockfile of lockfiles) if (existsSync(lockfile)) unlinkSync(lockfile);

if (!existsSync('/data/data')) {
    mkdirSync('/data/data');
}

if (!existsSync('/data/data/dht_peercache.db')) {
    writeFileSync('/data/data/dht_peercache.db', '{}');
}

if (!existsSync('/data/keystore/arweave.json')) {
    writeFileSync('/data/keystore/arweave.json', '{}');
}

console.info('Done.');
