const crypto = require('crypto')
const eccrypto = require("eccrypto");

module.exports.encryptPlainTextAndKey = async(host, plaintext, publicKey) => {
      const symmetricKey = crypto.randomBytes(24)
      const iv = crypto.randomBytes(16)

      const cipher = crypto.createCipheriv('aes192', symmetricKey, iv)
      const encryptedMessage = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()])
      const publicKeyBuffer = Buffer.concat([
          Buffer.from('04', 'hex'),
          Buffer.from(publicKey.replace('0x', ''), 'hex')
      ])

      const hostNameHash = crypto.createHash('sha256');
      hostNameHash.update(host);
      const encryptedSymmetricObj = await eccrypto.encrypt(publicKeyBuffer, Buffer.from(
          `|${hostNameHash.digest('hex')}|${symmetricKey.toString('hex')}|${iv.toString('hex')}|`
      ))

      const encryptedSymmetricKey = {}

      for (const k in encryptedSymmetricObj) {
          encryptedSymmetricKey[k] = encryptedSymmetricObj[k].toString('hex')
      }

      return {
          encryptedMessage,
          encryptedSymmetricObj,
          encryptedSymmetricKey: JSON.stringify(encryptedSymmetricKey)
      }
  }

module.exports.decryptCipherTextAndKey = async (cypertext, encryptedSymmetricObj, privateKey) => {
      const symmetricObj = await eccrypto.decrypt(Buffer.from(privateKey, 'hex'), encryptedSymmetricObj)
      const [, hostNameHash, symmetricKey, iv] = symmetricObj.toString().split('|')
      const decipher = crypto.createDecipheriv('aes192', Buffer.from(symmetricKey, 'hex'), Buffer.from(iv, 'hex'))
      const plaintext = Buffer.concat([decipher.update(cypertext), decipher.final()])

      return {plaintext, hostNameHash, symmetricKey, iv}
  }