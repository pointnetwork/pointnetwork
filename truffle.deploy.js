#!/usr/bin/env node

const { execSync } = require('child_process');

console.log(execSync('truffle deploy --network development', { encoding: 'utf8' }));
