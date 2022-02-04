#!/bin/env

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const utils = require('#utils');
const defaultConfig = require('../resources/defaultConfig.json');

const BITS = defaultConfig.storage.redkey_encryption_bits;
const STUPID_PADDING = defaultConfig.storage.redkey_stupid_padding;

function encryptFile(filePath, toFile, privKey) {
    // chunkId and linkId are only needed for sanity check between threads, just in case
    const fromFile = path.resolve(filePath);

    const writeSize = BITS / 8;
    const readSize = writeSize - STUPID_PADDING;

    // todo: check that file exists and it's a file?

    const fd = fs.openSync(fromFile, 'r');
    const fe = fs.openSync(toFile, 'w+');
    let c = 0;
    let encrypted = Buffer.alloc(readSize); // initial empty buffer for CBC mode
    while (true) {
        let buffer = Buffer.alloc(writeSize);
        const bytesRead = fs.readSync(fd, buffer, STUPID_PADDING, readSize, null);

        // Turning ECB mode into CBC mode

        // Note: We do encrypted.slice to never have the first STUPID_PADDING bytes not 0x00 even after XOR
        const mixIn = Buffer.alloc(readSize);
        encrypted.copy(mixIn, STUPID_PADDING, STUPID_PADDING, readSize);

        buffer = utils.xorBuffersInPlace(buffer, mixIn);

        try {
            encrypted = crypto.privateEncrypt(
                {key: privKey, padding: crypto.constants.RSA_NO_PADDING},
                buffer
            );
        } catch (e) {
            console.log('crypto.privateEncrypt returned error: ' + e);
            console.log(
                'Initial buffer:',
                buffer.length + ' bytes:',
                buffer.toString('hex'),
                buffer.toString()
            );
            console.log({privKey});
            console.log({c});
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

process.on('message', async message => {
    if (message.command === 'encrypt') {
        const {filePath, chunkId, privKey, linkId} = message;

        const suffix = '.' + linkId + '.enc';
        const encryptedPath = filePath + suffix;

        encryptFile(filePath, encryptedPath, privKey);

        // send response to master process
        // todo: reading the file AGAIN??? can't you hash it while encrypting?
        process.send({
            command: 'encrypt',
            success: true,
            chunkId: chunkId,
            linkId: linkId,
            hash: utils.hashFnHex(fs.readFileSync(encryptedPath, {encoding: null}))
        });
    }
});

module.exports = {encryptFile};
