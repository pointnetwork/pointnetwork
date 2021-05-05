const ZProxy = require('../../client/proxy');
let { encryptPlainTextAndKey, decryptCipherTextAndKey } = require('../../client/encryptUtils');

describe("Client/ZProxy", () => {
    test("it should correctly sanitize the text/html inputs", () => {
        const tests = {
            "<script></script>": "",
            "<script language='javascript'></script>": "",
            "<xml></xml>": "",
            "<invalid-tag></invalid-tag>": "",
            '<a href="https://google.com" invalid-attr="5">Test</a>': '<a href="https://google.com">Test</a>',
        };

        const testsIdentical = [
            "",
            "<html><body></body></html>",
            '<a href="https://google.com">Test</a>',
        ];

        mockedCtx = {
            config: {
                client: {
                    zproxy: {
                        port: 0
                    }
                },
            },
        };
        zproxy = new ZProxy(mockedCtx);

        for(let input in tests) {
            let expectedOutput = tests[input];
            expect(zproxy.sanitize(input)).toEqual(expectedOutput);
        }

        testsIdentical.forEach((input) => {
            expect(zproxy.sanitize(input)).toEqual(input);
        });
    });

    test('encrypts a plain text with a random symmetric key and the key itself with ecies', async () => {
        try {
            const plaintext = 'Foo'
            const publicKey = '0x1b26e2c556ae71c60dad094aa839162117b28a462fc4c940f9d12675d3ddfff2aeef60444a96a46abf3ca0a420ef31bff9f4a0ddefe1f80b0c133b85674fff34'

            const encryptionResult = await encryptPlainTextAndKey('localhost', plaintext, publicKey)
            const privateKey = '4e094c21d2b1a068da6ecbb8d0aeea65569741a6c14c592cb29d8b7aadf5ea49'

            const encryptedSymmetricKey = JSON.parse(encryptionResult.encryptedSymmetricKey)
            const encryptedSymmetricObj = {}

            for (const k in encryptedSymmetricKey) {
                encryptedSymmetricObj[k] = Buffer.from(encryptedSymmetricKey[k], 'hex')
            }

            const decryptionResult = await decryptCipherTextAndKey(
                'localhost',
                Buffer.from(encryptionResult.encryptedMessage, 'hex'),
                encryptedSymmetricObj, // encryptionResult.encryptedSymmetricObj,
                privateKey
            )
            expect(decryptionResult.plaintext.toString()).toEqual(plaintext)
        } catch (e) {
            console.error(e)
            throw e
        }
    })

    test('should return null values if the host decrypting a message is different from the one that encrypted it', async () => {
        try {
            const plaintext = 'Foo'
            const publicKey = '0x1b26e2c556ae71c60dad094aa839162117b28a462fc4c940f9d12675d3ddfff2aeef60444a96a46abf3ca0a420ef31bff9f4a0ddefe1f80b0c133b85674fff34'

            const encryptionResult = await encryptPlainTextAndKey('email', plaintext, publicKey)
            const privateKey = '4e094c21d2b1a068da6ecbb8d0aeea65569741a6c14c592cb29d8b7aadf5ea49'

            const encryptedSymmetricKey = JSON.parse(encryptionResult.encryptedSymmetricKey)
            const encryptedSymmetricObj = {}

            for (const k in encryptedSymmetricKey) {
                encryptedSymmetricObj[k] = Buffer.from(encryptedSymmetricKey[k], 'hex')
            }

            const decryptionResult = await decryptCipherTextAndKey(
                'localhost',
                Buffer.from(encryptionResult.encryptedMessage, 'hex'),
                encryptedSymmetricObj, // encryptionResult.encryptedSymmetricObj,
                privateKey
            )
            expect(decryptionResult.plaintext).toEqual(null)
            expect(decryptionResult.hostNameHash).toEqual(null)
            expect(decryptionResult.symmetricKey).toEqual(null)
            expect(decryptionResult.iv).toEqual(null)
        } catch (e) {
            console.error(e)
            throw e
        }
    })
});
