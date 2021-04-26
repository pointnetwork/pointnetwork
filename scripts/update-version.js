#!/usr/bin/env node

const version = process.argv[2];

if (!/^\d+\.\d+\.\d+$/.test (version)) {
    throw new Error(
        `Unsupported version format: "${ version }". ` +
        `Please provide a unique sequence of major, minor and build version identifiers.`
    )
}

const varName = 'POINTNETWORK_NODE_VERSION'
const envFile = require ('path').resolve (__dirname, '..', '.env')

require ('child_process').execSync (
    `npm version ${ version } &&` +
    `sed -i '' 's/${ varName }=v\\([0-9]\\{1,\\}\\.*\\)\\{3\\}/${ varName }=v${ version }/' ${ envFile } && ` +
    `git add ${ envFile } && git commit -m 'updated image version' &&`
    `git push && git push origin v${ version }`
).toString ()

console.info (`Successfully pushed new version tag "v${ version }"`)
