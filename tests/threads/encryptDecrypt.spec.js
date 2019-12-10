const encrypt = require('../../threads/encrypt');
const decrypt = require('../../threads/decrypt');
const fs = require('fs');

//todo

describe("Thread/{Encrypt,Decrypt}", () => {
    test("D(E(plaintext)) should return plaintext", () => {
        const alicePrivateKey1024 = fs.readFileSync('./tests/_helpers/alice-1024.key');
        const alicePublicKey1024  = fs.readFileSync('./tests/_helpers/alice-1024.pub');

        // todo: rewrite both the files and the test so that they support streams, not just files
        let filesToTest = ['simple-numbers.txt', 'moby-dick.txt', 'tree.jpg'];

        for(let file of filesToTest) {
            encryptDecrypt(alicePublicKey1024, alicePrivateKey1024, fs.readFileSync('./tests/_helpers/encryptDecrypt/'+file));
        }
    });
});

function encryptDecrypt(pubKey, privKey, plaintext) {
    const tmpFileNameFrom   = randomTempFileName();
    const tmpFileNameTo     = randomTempFileName();
    const tmpFileNameResult = randomTempFileName();
    try {
        let plaintextBuf = (Buffer.isBuffer(plaintext)) ? plaintext : Buffer.from(plaintext);

        fs.writeFileSync(tmpFileNameFrom, plaintextBuf);

        encrypt.encryptFile(tmpFileNameFrom, tmpFileNameTo, privKey);

        let encryptedBuf = fs.readFileSync(tmpFileNameTo);
        // console.log('encryptedBuf', encryptedBuf.toString());
        // console.log('encryptedBuf.length', encryptedBuf.length);

        decrypt.decryptFile(tmpFileNameTo, tmpFileNameResult, pubKey);

        let result = fs.readFileSync(tmpFileNameResult);

        // console.log('result before slice', result.toString());
        result = result.slice(0, plaintextBuf.length);

        // console.log('plaintextBuf', plaintextBuf.toString());
        // console.log('plaintextBuf.length', plaintextBuf.length);
        // console.log('result', result.toString());

        expect(result).toEqual(plaintextBuf);

        removeTempFiles(tmpFileNameFrom, tmpFileNameTo, tmpFileNameResult);
    } catch(e) {
        removeTempFiles(tmpFileNameFrom, tmpFileNameTo, tmpFileNameResult);
        throw e;
    }
}

function randomTempFileName() {
    return '/tmp/pointnetwork_test_random_'+Math.random().toString(36).substring(7);
}
function removeTempFiles(...files) {
    for(let file of files) {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
        }
    }
}