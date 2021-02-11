#!/usr/bin/env node

const { execSync } = require ('child_process')
const { writeFileSync } = require('fs')

const config = require('/.point/config.json')
const {
    HOST,
    PORT,
    PUB_KEY,
    PRV_KEY,
    API_PORT,
    ZPROXY_PORT,
    BOOTSTRAP_NODE,
} = process.env

console.log ('Deploying the contracts', process.env)

if (API_PORT) config.api = { port: parseInt (API_PORT) }
if (ZPROXY_PORT) config.client.zproxy = { port: parseInt (ZPROXY_PORT) }
if (BOOTSTRAP_NODE) config.network.bootstrap_nodes = [ BOOTSTRAP_NODE ]

config.network.communication_external_host = HOST || 'localhost'
config.network.communication_port = PORT
config.client.wallet = { account: PUB_KEY, privateKey: PRV_KEY }

console.log ({ config })

writeFileSync('/.point/config.json', config, 'utf-8')

const result = execSync ('pushd truffle && truffle deploy --network development && popd', 'utf-8')
console.log ('Result:', result)
