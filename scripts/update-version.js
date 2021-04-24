#!/usr/bin/env node

const version = process.argv[2];

if (!/^\d+\.\d+\.\d+$/.test (version)) {
    throw new Error(
        `Unsupported version format: "${ version }". ` +
        `Please provide a unique sequence of major, minor and build version identifiers.`
    )
}

require ('child_process').execSync (
    `npm version ${ version } && git push && git push origin v${ version }`
).toString ()

console.info (`Successfully pushed new version tag "v${ version }"`)
