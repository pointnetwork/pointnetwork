#!/usr/bin/env node

const { execSync } = require ('child_process')
const { existsSync, writeFileSync } = require ('fs')

function execCommand (command) {
    try {
        return execSync (command).toString()
    } catch (e) {
        return (e.stderr && e.stderr.toString ()) || (e.stdout && e.stdout.toString ()) || e.toString ()
    }
}

console.log (execCommand ('truffle deploy --network development'))

const contracts = {
    Identity: undefined,
    Migrations: undefined,
    StorageProviderRegistry: undefined
}

for (const contractName in contracts) {
    const path = `/build/${ contractName }.json`

    if (require ('fs').existsSync (path)) {
        const { networks } = require (path)
        const network = process.env.NETWORK_ID || Math.max (...Object.keys (networks))

        contracts[contractName] = networks[network].address
    }
}

if (contracts.Identity && contracts.StorageProviderRegistry) {
    console.log ('Updating configuration file...')

    const configFileName = '/sharedConfig.json'
    const config = require (configFileName)

    config.network.identity_contract_address = contracts.Identity
    config.network.storage_provider_registry_contract_address = contracts.StorageProviderRegistry

    writeFileSync (configFileName, JSON.stringify(config, null, 2))
    console.log('Done.')
}
