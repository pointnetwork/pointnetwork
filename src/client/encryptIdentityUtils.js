const crypto = require('crypto');
const eccrypto = require('eccrypto');

/**
 * Encrypt multiple data with multiple public keys. Each data will be encrypted with a different symmetric key
 * and then will be encrypted for each public key passed. 
 * 
 * @param {string} host - the host for the data to be encrypted
 * @param {string[]} dataArray - an array of data to be encrypted. Each data will be encrypted with a different symmetric key.
 * @param {string[]} publicKeys - an array of public keys for encrypting data.
 * 
 * @returns {object} {encryptedMessages - array of encrypted data, encryptedMessagesSymmetricObjs - matrix of Symmetric Objects for each data and each public key passed}
 * 
 */
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

/**
 * Encrypt data using a symmetric key generated and a public key passed (digital envelope).
 * 
 * @param {string} host - the host for the data to be encrypted
 * @param {string} plaintext - the data to be encrypted
 * @param {string} publicKey - the public key for using in the encryption
 * @returns {object} - {encryptedMessage - the encrypted data, encryptedSymmetricObj - the symmetric object, encryptedSymmetricObjJSON - the symmetric object as json}
 */
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

/**
 * Decrypts the symmetric object using the private key passed. 
 * 
 * @param {string} host - the host for the data to be encrypted
 * @param {object} encryptedSymmetricObj - symmetryc object encrypted with a public key
 * @param {string} privateKey - the private key for decrypt the symmetric object
 * 
 * @returns {string} - the symmetric key decrypted.
 */
module.exports.decryptSymmetricKey = async (host, encryptedSymmetricObj, privateKey) => {
    const decryptHostNameHash = crypto.createHash('sha256');
    decryptHostNameHash.update(host);
    const symmetricObj = await eccrypto.decrypt(
        Buffer.from(privateKey, 'hex'),
        encryptedSymmetricObj
    );
    const [, hostNameHash] = symmetricObj.toString().split('|');
    if (decryptHostNameHash.digest('hex') !== hostNameHash) {
        throw new Error('Host is invalid');
    }
    return symmetricObj.toString();
};

/**
 * Decrypt data using a decypted symmetric key.
 * 
 * @param {string} host - the host which will 
 * @param {string} cyphertext - the encrypted text 
 * @param {object} symmetricObj - the decrypted symmetric object
 * @returns {object} - {plaintext - the decrypted text, hostNameHash - hash of host name used, symmetricKey - the symmetric key used, iv - intialization vector used}
 */
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

/**
 * Decrypts data using a private key and an encryptedSymmetricObj (which was encrypted using the public key).
 * 
 * @param {string} host - the host for decryption
 * @param {string} cyphertext - the encrypted text
 * @param {object} encryptedSymmetricObj - the encrypted symmetric object
 * @param {string} privateKey - the private key for decryption
 * 
 * @returns object - {plaintext - decrypted text, hostNameHash - hash of host name used, symmetricKey - the symmetric key used, iv - intialization vector used}
 */
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

//deleted unused and not working method.

/**
 * Converts from JSON to object the symmetric object
 * 
 * @param {object} encryptedSymmetricObjJSON - encrypted object in json format
 * @returns {object} encryptedSymmetricObj - encrypted object in original format (binary parts)
 */
module.exports.getEncryptedSymetricObjFromJSON = encryptedSymmetricObjJSON => {
    const encryptedSymmetricObj = {};
    for (const k in encryptedSymmetricObjJSON) {
        encryptedSymmetricObj[k] = Buffer.from(encryptedSymmetricObjJSON[k], 'hex');
    }
    return encryptedSymmetricObj;
};
