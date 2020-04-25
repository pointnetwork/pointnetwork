const encrypt = require('../../threads/encrypt');
const decrypt = require('../../threads/decrypt');
const fs = require('fs');

//todo

// openssl genrsa 768 > ./_local/alice-768.key
// openssl genrsa 768 > ./_local/bob-768.key
// openssl genrsa 512 > ./_local/alice-512.key
// openssl genrsa 512 > ./_local/bob-512.key
// openssl rsa -in ./_local/alice-768.key -pubout > ./_local/alice-768.pub
// openssl rsa -in ./_local/bob-768.key -pubout > ./_local/bob-768.pub
// openssl rsa -inform PEM -pubin -in ./_local/bob.pub -text -noout

const defaultConfig = require('../../resources/defaultConfig.json');
const BITS = defaultConfig.storage.redkey_encryption_bits; // todo: make it read from the actual config, not default

describe("Thread/{Encrypt,Decrypt}", () => {
    test("D(E(plaintext)) should return plaintext", () => {
        const alicePrivateKey = fs.readFileSync('./tests/_helpers/keys/alice-'+BITS+'.key');
        const alicePublicKey  = fs.readFileSync('./tests/_helpers/keys/alice-'+BITS+'.pub');

        // todo: rewrite both the files and the test so that they support streams, not just files
        let filesToTest = ['simple-numbers.txt', 'moby-dick.txt', 'tree-unsplash.jpg', 'test1.css', 'test1.json'];

        for(let file of filesToTest) {
            encryptDecrypt(alicePublicKey, alicePrivateKey, fs.readFileSync('./tests/_helpers/encryptDecrypt/'+file));
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