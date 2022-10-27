const {encryptData, decryptData} = require('./encryptIdentityUtils');

describe('Encrypt/Decrypt data', () => {
    const host = 'any.point';
    const msg = 'secret message to be encrypted';

    const alice = {
        publ:
            '0xc264f479169ffec607a050dbeb6c894c0cfff4de632358d8e1850d99a290f785d129f4a5a71e8d4f767a753e8dccaaf17636755a6becd69c97baff8e978efb03',
        priv: '59ce1093128cd38a08b5fc6009e9e66d5b1bdd24e9e1d97f7dcf2d6ddfc16a2c'
    };

    const bob = {
        publ:
            '0x4105651497e7c2150d304aef76bd8a95fcd832f6810b5aa94af2c4fc48328039cfe281b84d362582ed8443e6354013b85eda8bef78bd7a252d21869d5a1d3616',
        priv: '429166ffb1964d38027ac0d3aaa79e65f4b395a61d8c7cba3ea9c523adf5e666'
    };

    it('should encrypt and decypt message', async () => {
        const {encryptedMessage, encryptedSymmetricObj} = await encryptData(host, msg, alice.publ);
        const buf = Buffer.from(encryptedMessage, 'hex');
        const {plaintext} = await decryptData(host, buf, encryptedSymmetricObj, alice.priv);
        expect(plaintext.toString()).toEqual(msg);
    });

    it('should not decrypt msg encrypted for other recipient', async () => {
        const {encryptedMessage, encryptedSymmetricObj} = await encryptData(host, msg, alice.publ);
        const buf = Buffer.from(encryptedMessage, 'hex');
        await expect(decryptData(host, buf, encryptedSymmetricObj, bob.priv)).rejects.toThrow();
    });

    it('should not decrypt msg encrypted with different host', async () => {
        const {encryptedMessage, encryptedSymmetricObj} = await encryptData(host, msg, bob.publ);
        const buf = Buffer.from(encryptedMessage, 'hex');
        const badHost = 'not_the_same_host_used_for_encryption';
        await expect(decryptData(badHost, buf, encryptedSymmetricObj, bob.priv)).rejects.toThrow();
    });
});
