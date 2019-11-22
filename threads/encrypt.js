#!/bin/env

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const utils = require('../core/utils');
const defaultConfig = require('../resources/defaultConfig.json');

const BITS = defaultConfig.storage.redkey_encryption_bits;
const STUPID_PADDING = defaultConfig.storage.redkey_stupid_padding;

function encryptFile(filePath, toFile, privKey, suffix) {
    const fromFile = path.resolve(filePath);

    const writeSize = BITS/8;
    const readSize = writeSize-STUPID_PADDING;

    // todo: check that file exists and it's a file?

    let fd = fs.openSync(fromFile, 'r');
    let fe = fs.openSync(toFile, 'w+');
    let c = 0;
    let encrypted = Buffer.alloc(readSize); // initial buffer for CBC mode
    while (true) {
        let buffer = Buffer.alloc(writeSize);
        let bytesRead = fs.readSync(fd, buffer, STUPID_PADDING, readSize, null);

        // Turning ECB mode into CBC mode
        buffer = utils.xorBuffersInPlace(buffer, encrypted);

        try {
            encrypted = crypto.privateEncrypt({key: privKey, padding: crypto.constants.RSA_NO_PADDING}, buffer);
        } catch(e) {
            throw e;
        }

        fs.writeSync(fe, encrypted, 0, encrypted.length);

        if (bytesRead !== readSize) {
            break;
        }

        c++;
    }
    fs.closeSync(fd);
    fs.closeSync(fe);
}

process.on('message', async (message) => {
    if (message.command === 'encrypt') {
        const {filePath, chunkId, privKey, linkId} = message;

        const suffix = '.'+linkId+'.enc';
        const encryptedPath = filePath + suffix;

        encryptFile(filePath, encryptedPath, privKey, suffix);

        // send response to master process
        // todo: reading the file AGAIN??? can't you hash it while encrypting?
        process.send({ 'command': 'encrypt', 'success': true, 'chunkId': chunkId, 'linkId': linkId, 'hash': utils.hashFnHex(fs.readFileSync(encryptedPath)) });
    }
});