#!/bin/env
/* eslint-disable no-console */
const fs = require('fs');
const crypto = require('crypto');
const utils = require('../core/utils');
const defaultConfig = require('../../resources/defaultConfig.json');

const BITS = defaultConfig.storage.redkey_encryption_bits;
const STUPID_PADDING = defaultConfig.storage.redkey_stupid_padding;

function decryptFile(fileIn, fileOut, pubKey) {
    const readSize = BITS / 8;
    const writeSize = readSize - STUPID_PADDING;

    const fe = fs.openSync(fileIn, 'r');
    const fd = fs.openSync(fileOut, 'w+');
    let previousReadBuffer = Buffer.alloc(readSize); // initial buffer for CBC mode
    while (true) {
        const readBuffer = Buffer.alloc(readSize);
        const bytesRead = fs.readSync(fe, readBuffer, 0, readSize, null);

        let decrypted = crypto.publicDecrypt(
            {key: pubKey, padding: crypto.constants.RSA_NO_PADDING},
            readBuffer
        );

        // Turning ECB mode into CBC mode
        const mixIn = Buffer.alloc(writeSize);
        previousReadBuffer.copy(mixIn, STUPID_PADDING, STUPID_PADDING, writeSize);
        decrypted = utils.xorBuffersInPlace(decrypted, mixIn);

        // for STUPID_PADDING==1, decrypted now has decrypted data starting at byte 1, and byte 0 should be 0x00
        // todo: validate that the stupid padding bytes are 0x00 (or valid)?
        // todo: validate that the rest of the padding is filled with 0x00

        fs.writeSync(fd, decrypted, STUPID_PADDING, decrypted.length - STUPID_PADDING);

        if (bytesRead !== readSize) break;

        previousReadBuffer = readBuffer;
    }

    fs.closeSync(fe);
    fs.closeSync(fd);
}

process.on('message', async message => {
    if (message.command === 'decrypt') {
        const {fileIn, fileOut, chunkId, pubKey} = message;

        try {
            decryptFile(fileIn, fileOut, pubKey);
        } catch (e) {
            console.log('Error', e);
            throw e;
        }

        // send response to master process
        // todo from encrypt.js: todo: reading the file AGAIN??? can't you hash it while encrypting?
        process.send({
            command: 'decrypt',
            success: true,
            chunkId: chunkId,
            hashIn: utils.hashFnHex(fs.readFileSync(fileIn)),
            hashOut: utils.hashFnHex(fs.readFileSync(fileOut, {encoding: null}))
        });
    }
});

module.exports = {decryptFile};
