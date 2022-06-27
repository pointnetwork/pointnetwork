const {encryptData, decryptData} = require('../../src/client/encryptIdentityUtils');
const {setAsAttachment} = require('../../src/client/proxy/proxyUtils');

// TODO: Jest report gracefully exit failure even if I only leave imports and mock all the tests
// TODO: figure out what is wrong
describe('Proxy utils', () => {
    // TODO: sanitize HTML is broken
    // test('it should correctly sanitize the text/html inputs', () => {
    //     const tests = {
    //         '<script></script>': '',
    //         '<script language=\'javascript\'></script>': '',
    //         '<xml></xml>': '',
    //         '<invalid-tag></invalid-tag>': '',
    //         '<a href="https://google.com" invalid-attr="5">Test</a>':
    //             '<a href="https://google.com">Test</a>'
    //     };
    //
    //     const testsIdentical = [
    //         '',
    //         '<html><body></body></html>',
    //         '<a href="https://google.com">Test</a>'
    //     ];
    //
    //     expect.assertions(Object.keys(tests).length + testsIdentical.length);
    //
    //     const zproxy = new ZProxy({});
    //
    //     for (const input in tests) {
    //         const expectedOutput = tests[input];
    //         expect(zproxy.sanitize(input)).toEqual(expectedOutput);
    //     }
    //
    //     testsIdentical.forEach(input => {
    //         expect(zproxy.sanitize(input)).toEqual(input);
    //     });
    // });

    test('encrypts a plain text with a random symmetric key and the key itself with ecies', async () => {
        try {
            expect.assertions(1);

            const plaintext = 'Foo';
            const publicKey =
                '0x1b26e2c556ae71c60dad094aa839162117b28a462fc4c940f9d12675d3ddfff2aeef60444a96a46abf3ca0a420ef31bff9f4a0ddefe1f80b0c133b85674fff34';

            const encryptionResult = await encryptData('localhost', plaintext, publicKey);
            const privateKey = '4e094c21d2b1a068da6ecbb8d0aeea65569741a6c14c592cb29d8b7aadf5ea49';

            const encryptedSymmetricObj = encryptionResult.encryptedSymmetricObj;

            const decryptionResult = await decryptData(
                'localhost',
                Buffer.from(encryptionResult.encryptedMessage, 'hex'),
                encryptedSymmetricObj, // encryptionResult.encryptedSymmetricObj,
                privateKey
            );

            expect(decryptionResult.plaintext.toString()).toEqual(plaintext);
        } catch (e) {
            console.error(e);
            throw e;
        }
    });

    test('should return null values if the host decrypting a message is different from the one that encrypted it', async () => {
        try {
            expect.assertions(1);

            const plaintext = 'Foo';
            const publicKey =
                '0x1b26e2c556ae71c60dad094aa839162117b28a462fc4c940f9d12675d3ddfff2aeef60444a96a46abf3ca0a420ef31bff9f4a0ddefe1f80b0c133b85674fff34';

            const encryptionResult = await encryptData('email', plaintext, publicKey);
            const privateKey = '4e094c21d2b1a068da6ecbb8d0aeea65569741a6c14c592cb29d8b7aadf5ea49';

            const encryptedSymmetricObj = encryptionResult.encryptedSymmetricObj;

            await expect(
                decryptData(
                    'localhost',
                    Buffer.from(encryptionResult.encryptedMessage, 'hex'),
                    encryptedSymmetricObj,
                    privateKey
                )
            ).rejects.toThrow('Host is invalid');
        } catch (e) {
            console.error(e);
            throw e;
        }
    });

    describe('setAsAttachment', () => {
        describe('when requesting directly from storage', () => {
            const urlPathname = '/_storage/';
            describe('when acceept headers allow application types or wildcards', () => {
                const acceptHeaders = 'text/html;application/xml;application/xhtml+xml;*/*';
                test('when contentType is video or image it should return FALSE', () => {
                    expect(setAsAttachment(urlPathname, 'video', acceptHeaders)).toBeFalsy();
                    expect(setAsAttachment(urlPathname, 'image', acceptHeaders)).toBeFalsy();
                });
                test('when contentType is not video or image it should return TRUE', () => {
                    expect(setAsAttachment(urlPathname, 'javascript', acceptHeaders)).toBeTruthy();
                    expect(setAsAttachment(urlPathname, 'application/xml', acceptHeaders)).toBeTruthy();
                });
            });
        });
    });
});
