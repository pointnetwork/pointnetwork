#!/bin/env

const fs = require('fs');
const crypto = require('crypto');
const utils = require('../core/utils');
const defaultConfig = require('../resources/defaultConfig.json');

const BITS = defaultConfig.storage.redkey_encryption_bits;
const STUPID_PADDING = defaultConfig.storage.redkey_stupid_padding;

async function decryptFile(fileIn, fileOut, chunkId, pubKey) {
    const readSize = BITS/8;
    const writeSize = readSize-STUPID_PADDING;

    let fe = fs.openSync(fileIn, 'r');
    let fd = fs.openSync(fileOut, 'w+');
    let c = 0;
    let previousReadBuffer = Buffer.alloc(readSize); // initial buffer for CBC mode
    while (true) {
        let readBuffer = Buffer.alloc(readSize);
        let bytesRead = fs.readSync(fe, readBuffer, 0, readSize, null);

        let decrypted = crypto.publicDecrypt({key: pubKey, padding: crypto.constants.RSA_NO_PADDING}, readBuffer);

        // Turning ECB mode into CBC mode
        decrypted = utils.xorBuffersInPlace(decrypted, previousReadBuffer);

        // decrypted now has decrypted data starting at byte 1, and byte 0 should be zero // todo: validate that the first byte is 0?

        fs.writeSync(fd, decrypted, STUPID_PADDING, decrypted.length-STUPID_PADDING);

        if (bytesRead !== readSize) break;

        previousReadBuffer = readBuffer;

        c++;

        await utils.nullAsyncFn(); // todo: replace with just await null?
    }

    fs.closeSync(fe);
    fs.closeSync(fd);
}

process.on('message', async (message) => {
    if (message.command === 'decrypt') {
        const {fileIn, fileOut, chunkId, pubKey} = message;

        try {
            await decryptFile(fileIn, fileOut, chunkId, pubKey);
        } catch(e) {
            console.log('Error', e);
            throw e;
        }

        // send response to master process
        // todo from encrypt.js: todo: reading the file AGAIN??? can't you hash it while encrypting?
        process.send({ 'command': 'decrypt', 'success': true, 'chunkId': chunkId, 'hashIn': utils.hashFnHex(fs.readFileSync(fileIn)), 'hashOut': utils.hashFnHex(fs.readFileSync(fileOut)) });
    }
});