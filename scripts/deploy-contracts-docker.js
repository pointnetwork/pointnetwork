#!/usr/bin/env node

const { execSync } = require ('child_process')

function execCommand (command) {
    try {
        return execSync (command).toString()
    } catch (e) {
        return (e.stderr && e.stderr.toString ()) || (e.stdout && e.stdout.toString ()) || e.toString ()
    }
}

console.log (execCommand ('truffle deploy --network development'))
