const crypto = require('crypto');
const eccrypto = require('eccrypto');

module.exports.encryptMultipleData = async (host, dataArray, publicKeys) => {
    //Create response arrays
    const encryptedMessages = [];
    const encryptedMessagesSymmetricObjs = [];

    // Hash host name
    const hostNameHashHex = crypto
        .createHash('sha256')
        .update(host)
        .digest('hex');

    // Encrypt each data passed
    for (const data of dataArray){
        // Secret symmetric key, generated randomly
        const symmetricKey = crypto.randomBytes(24);

        // Random initialization vector
        const iv = crypto.randomBytes(16);

        // Initialize cipher
        const cipher = crypto.createCipheriv('aes192', symmetricKey, iv);
        // Encrypt the message with symmetric key
        const encryptedMessage = Buffer.concat([cipher.update(data, 'ascii'), cipher.final()]);
        encryptedMessages.push(encryptedMessage);

        // Prepare the data msg for encryption
        const messageForPublicKeyEncryption = `|${hostNameHashHex}|${symmetricKey.toString(
            'hex'
        )}|${iv.toString('hex')}|`;
        
        //for each public key
        const encryptedSymmetricObjs = [];
        for (const pk of publicKeys){
            // Prepare public key buffer
            const publicKeyBuffer = Buffer.concat([
                Buffer.from('04', 'hex'),
                Buffer.from(pk.replace('0x', ''), 'hex')
            ]);

            //Encrypt secret information for the recipient with their public key
            const encryptedSymmetricObj = await eccrypto.encrypt(
                publicKeyBuffer,
                Buffer.from(messageForPublicKeyEncryption)
            );

            const encryptedSymmetricObjChunks = {};
            for (const k in encryptedSymmetricObj) {
                encryptedSymmetricObjChunks[k] = encryptedSymmetricObj[k].toString('hex');
            }

            encryptedSymmetricObjs.push(
                {
                    pk: pk,
                    encryptedSymmetricObj: encryptedSymmetricObj,
                    encryptedSymmetricObjJSON: JSON.stringify(encryptedSymmetricObjChunks)
                }
            );
        }
        encryptedMessagesSymmetricObjs.push(encryptedSymmetricObjs);
    }
    const encryptedMessagesStr = encryptedMessages.map((e) => e.toString('hex'));
    return {
        encryptedMessages: encryptedMessagesStr,
        encryptedMessagesSymmetricObjs: encryptedMessagesSymmetricObjs
    };
};

module.exports.encryptData = async (host, plaintext, publicKey) => {
    // Secret symmetric key, generated randomly
    const symmetricKey = crypto.randomBytes(24);

    // Random initialization vector
    const iv = crypto.randomBytes(16);

    // Initialize cipher
    const cipher = crypto.createCipheriv('aes192', symmetricKey, iv);

    // Encrypt the message with symmetric key
    const encryptedMessage = Buffer.concat([cipher.update(plaintext, 'ascii'), cipher.final()]);

    // Prepare public key buffer
    const publicKeyBuffer = Buffer.concat([
        Buffer.from('04', 'hex'),
        Buffer.from(publicKey.replace('0x', ''), 'hex')
    ]);

    // Hash host name
    const hostNameHashHex = crypto
        .createHash('sha256')
        .update(host)
        .digest('hex');

    // Encrypt secret information for the recipient with their public key
    const messageForPublicKeyEncryption = `|${hostNameHashHex}|${symmetricKey.toString(
        'hex'
    )}|${iv.toString('hex')}|`;
    const encryptedSymmetricObj = await eccrypto.encrypt(
        publicKeyBuffer,
        Buffer.from(messageForPublicKeyEncryption)
    );

    //
    const encryptedSymmetricObjChunks = {};
    for (const k in encryptedSymmetricObj) {
        encryptedSymmetricObjChunks[k] = encryptedSymmetricObj[k].toString('hex');
    }

    return {
        encryptedMessage: encryptedMessage.toString('hex'),
        encryptedSymmetricObj,
        encryptedSymmetricObjJSON: JSON.stringify(encryptedSymmetricObjChunks)
    };
};

module.exports.decryptSymmetricKey = async (host, encryptedSymmetricObj, privateKey) => {
    const decryptHostNameHash = crypto.createHash('sha256');
    decryptHostNameHash.update(host);
    const symmetricObj = await eccrypto.decrypt(
        Buffer.from(privateKey, 'hex'),
        encryptedSymmetricObj
    );
    const [, hostNameHash, symmetricKey, iv] = symmetricObj.toString().split('|');
    if (decryptHostNameHash.digest('hex') !== hostNameHash) {
        throw new Error('Host is invalid');
    }
    return symmetricObj.toString();
}

module.exports.decryptDataWithDecryptedKey = async (host, cyphertext, symmetricObj) => {
    const decryptHostNameHash = crypto.createHash('sha256');
    decryptHostNameHash.update(host);
    const [, hostNameHash, symmetricKey, iv] = symmetricObj.toString().split('|');
    if (decryptHostNameHash.digest('hex') !== hostNameHash) {
        throw new Error('Host is invalid');
    }
    const decipher = crypto.createDecipheriv(
        'aes192',
        Buffer.from(symmetricKey, 'hex'),
        Buffer.from(iv, 'hex')
    );
    const plaintext = Buffer.concat([decipher.update(cyphertext), decipher.final()]);

    return {plaintext, hostNameHash, symmetricKey, iv};
};


module.exports.decryptData = async (host, cyphertext, encryptedSymmetricObj, privateKey) => {
    const decryptHostNameHash = crypto.createHash('sha256');
    decryptHostNameHash.update(host);
    const symmetricObj = await eccrypto.decrypt(
        Buffer.from(privateKey, 'hex'),
        encryptedSymmetricObj
    );
    const [, hostNameHash, symmetricKey, iv] = symmetricObj.toString().split('|');
    if (decryptHostNameHash.digest('hex') !== hostNameHash) {
        throw new Error('Host is invalid');
    }
    const decipher = crypto.createDecipheriv(
        'aes192',
        Buffer.from(symmetricKey, 'hex'),
        Buffer.from(iv, 'hex')
    );
    const plaintext = Buffer.concat([decipher.update(cyphertext), decipher.final()]);

    return {plaintext, hostNameHash, symmetricKey, iv};
};

module.exports.decryptMultipleData = async (host, dataArray, encryptedSymmetricObj, privateKey) => {
    const decryptHostNameHash = crypto.createHash('sha256');
    decryptHostNameHash.update(host);
    const symmetricObj = await eccrypto.decrypt(
        Buffer.from(privateKey, 'hex'),
        encryptedSymmetricObj
    );
    const [, hostNameHash, symmetricKey, iv] = symmetricObj.toString().split('|');
    if (decryptHostNameHash.digest('hex') !== hostNameHash) {
        throw new Error('Host is invalid');
    }

    const decryptedDataArray = [];
    for (const data of dataArray){
        const decipher = crypto.createDecipheriv(
            'aes192',
            Buffer.from(symmetricKey, 'hex'),
            Buffer.from(iv, 'hex')
        );
        const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
        decryptedDataArray.push(plaintext);
    }

    return {decryptedDataArray, hostNameHash, symmetricKey, iv};
};

module.exports.getEncryptedSymetricObjFromJSON = encryptedSymmetricObjJSON => {
    const encryptedSymmetricObj = {};
    for (const k in encryptedSymmetricObjJSON) {
        encryptedSymmetricObj[k] = Buffer.from(encryptedSymmetricObjJSON[k], 'hex');
    }
    return encryptedSymmetricObj;
};
