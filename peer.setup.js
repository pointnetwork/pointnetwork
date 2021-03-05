#!/usr/bin/env node

const { execSync, spawn } = require ('child_process')
const { writeFileSync } = require('fs')
const config = require('/config.json')
const {
    HOST,
    PORT,
    PUB_KEY,
    PRV_KEY,
    API_PORT,
    ZPROXY_PORT,
    BOOTSTRAP_NODE,
} = process.env

process.on ('unhandledRejection', (rejection) => console.log ('Unhandled:', rejection))

if (API_PORT) config.api = { port: parseInt (API_PORT) }
if (ZPROXY_PORT) config.client.zproxy = { port: parseInt (ZPROXY_PORT) }
if (BOOTSTRAP_NODE) config.network.bootstrap_nodes = [ BOOTSTRAP_NODE ]

config.network.communication_external_host = HOST || 'localhost'
config.network.communication_port = PORT
config.client.wallet = { account: PUB_KEY, privateKey: PRV_KEY }

console.log ('Writing a file:')

writeFileSync('/.point/config.json', config, 'utf8')

// console.log ('running the truffle deployment')

// const result = execSync ('truffle deploy --network development', { cwd: '/app/truffle', encoding: 'utf8' })

console.log ('Starting the runtime', { result })

const runtime = spawnSync ('./point', ['--datadir', '/.point'], { cmd: '/app', encoding: 'utf8' })

runtime.stdout.pipe (process.stdout)
runtime.stderr.pipe (process.stderr)
runtime.on ('close', (code) => console.log (`Pointnetwork process is closed with code ${code}`))
runtime.on ('exit', resolve)
runtime.on ('error', reject)
