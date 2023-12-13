import crypto from 'crypto';
import {getFileBinary, uploadData} from './storage/index';
import {hashFn} from '../util/index';
import {getNetworkPrivateKey} from '../wallet/keystore';
import {getIdentity} from '../name_service/identity';
import {DisplayableError} from '../core/exceptions';

const eccrypto = require('eccrypto');
const ethereum = require('../network/providers/ethereum');

const ALGO = 'aes-256-gcm';

const KEY_LENGTH_BITS = 256;
const KEY_LENGTH_BYTES = KEY_LENGTH_BITS / 8;
const IV_LENGTH_BITS = 96;
const IV_LENGTH_BYTES = IV_LENGTH_BITS / 8;
const AUTH_TAG_LENGTH_BITS = 128;
const AUTH_TAG_LENGTH_BYTES = AUTH_TAG_LENGTH_BITS / 8;

if (ALGO !== 'aes-' + KEY_LENGTH_BITS + '-gcm') throw new DisplayableError('ALGO bits are not set correctly');

/**
 * encryptData will create a random key and iv, encrypt the data, and return all of it
 */

export class EncryptedData {
    key: Buffer;
    encryptedMaterial: Buffer;

    constructor(key: Buffer, encryptedMaterial: Buffer) {
        this.key = key;
        this.encryptedMaterial = encryptedMaterial;
    }

    static async createFromPlaintext(plaintext: Buffer, forceEncryptionKey: Buffer|null = null):
        Promise<EncryptedData> {
        const key = forceEncryptionKey || await crypto.randomBytes(KEY_LENGTH_BYTES);

        // make sure the key is not accidentally something silly like 0x0
        if (key.equals(Buffer.alloc(KEY_LENGTH_BYTES)) || key.byteLength !== KEY_LENGTH_BYTES) {
            throw new DisplayableError('key is empty or invalid length');
        }

        const iv = await crypto.randomBytes(IV_LENGTH_BYTES);
        const cipher = crypto.createCipheriv(ALGO, key, iv, {authTagLength: AUTH_TAG_LENGTH_BYTES});
        const cipherText = Buffer.concat([cipher.update(plaintext), cipher.final()]);
        const tag = cipher.getAuthTag();
        const encryptedMaterial = Buffer.concat([iv, tag, cipherText]);
        return new EncryptedData(key, encryptedMaterial);
    }

    async decrypt(): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const iv = this.encryptedMaterial.slice(0, IV_LENGTH_BYTES);
            const tag = this.encryptedMaterial.slice(IV_LENGTH_BYTES, IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);
            const cipherText = this.encryptedMaterial.slice(IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);
            const decipher = crypto.createDecipheriv(ALGO, this.key, iv, {authTagLength: AUTH_TAG_LENGTH_BYTES});
            decipher.setAuthTag(tag);
            let decrypted = Buffer.alloc(0);
            decipher.on('data', (chunk) => {
                decrypted = Buffer.concat([decrypted, chunk]);
            });
            decipher.on('end', () => {
                resolve(decrypted);
            });
            decipher.on('error', (err) => {
                reject(err);
            });
            decipher.write(cipherText);
            decipher.end();
        });
    }
}

export class EncryptedFile {
    key: Buffer;
    fileId: string;

    constructor(key: Buffer, fileId: string) {
        this.key = key;
        this.fileId = fileId;
    }
}

export const encryptDataSymmetric = async (data: Buffer, forceEncryptionKey: Buffer|null = null):
    Promise<EncryptedData> =>
    await EncryptedData.createFromPlaintext(data, forceEncryptionKey);

export const decryptDataSymmetric = async (encryptedData: EncryptedData): Promise<Buffer> =>
    await encryptedData.decrypt();

export const encryptAndUploadData = async (data: Buffer, waitForUpload = true): Promise<EncryptedFile> => {
    const encryptedData = await encryptDataSymmetric(data);
    const fileId = await uploadData(encryptedData.encryptedMaterial, waitForUpload);
    return new EncryptedFile(encryptedData.key, fileId);
};

export const downloadAndDecryptFile = async (encryptedFile: EncryptedFile): Promise<Buffer> => {
    // fetch the encrypted material using the file ID
    const encryptedMaterial = await getFileBinary(encryptedFile.fileId);

    // create an instance of the EncryptedData class using the key and the encrypted material
    const encryptedData = new EncryptedData(encryptedFile.key, encryptedMaterial);

    // decrypt the data using the decrypt method on the EncryptedData instance
    return await encryptedData.decrypt();
};

enum ItemType {
    string = 'string',
    number = 'number',
    object = 'object',
    boolean = 'boolean',
    Buffer = 'Buffer',
    EncryptedFile = 'EncryptedFile',
    EncryptionContainer = 'EncryptionContainer',
}

type AnyValueType = string|number|object|boolean|Buffer|EncryptedFile|EncryptionContainer|undefined;

interface ObjectWithAnyValues {
    [key: string]: AnyValueType;
}

export class EncryptionContainer {
    items: Map<string, AnyValueType>;
    itemTypes: Map<string, ItemType>;

    constructor() {
        this.items = new Map();
        this.itemTypes = new Map();
    }

    async set(k: string, v: AnyValueType): Promise<void> {
        if (typeof v === 'string') {
            this.items.set(k, await encryptAndUploadData(Buffer.from(v)));
            this.itemTypes.set(k, ItemType.string);
        } else if (Buffer.isBuffer(v)) {
            this.items.set(k, await encryptAndUploadData(v));
            this.itemTypes.set(k, ItemType.Buffer);
        } else if (typeof v === 'number') {
            this.items.set(k, v);
            this.itemTypes.set(k, ItemType.number);
        } else if (typeof v === 'boolean') {
            this.items.set(k, v);
            this.itemTypes.set(k, ItemType.boolean);
        } else if (v instanceof EncryptionContainer) {
            this.items.set(k, v);
            this.itemTypes.set(k, ItemType.EncryptionContainer);
        } else if (typeof v === 'object') {
            if (v instanceof EncryptedFile) {
                this.items.set(k, v);
                this.itemTypes.set(k, ItemType.EncryptedFile);
            } else {
                // normal JSON object

                // if empty
                if (Object.keys(v).length === 0) {
                    this.items.set(k, v);
                    this.itemTypes.set(k, ItemType.object);
                    return;
                }

                const container = new EncryptionContainer();
                for (const k2 in v) {
                    await container.set(k2, (v as ObjectWithAnyValues)[k2]); // todo
                }
                this.items.set(k, container);
                this.itemTypes.set(k, ItemType.EncryptionContainer);
            }
        // } else if (Array.isArray(v)) {
        //     // normal JSON object
        //     const container = new EncryptionContainer();
        //     for (const k2 = 0; k2 < v.length; k2++) {
        //         await container.set(k2, v[k2]);
        //     }
        //     this.items.set(k, container);
        //     this.itemTypes.set(k, ItemType.EncryptionContainer);
        } else {
            throw new DisplayableError('Unknown type');
        }
    }

    async get(path: string): Promise<AnyValueType> {
        const segments = path.split('/');
        let container: EncryptionContainer = this;
        for (let i = 0; i < segments.length - 1; i++) {
            const segment = segments[i];
            if (!container.items.has(segment)) {
                return undefined;
            }
            const item = container.items.get(segment);
            if (!(item instanceof EncryptionContainer)) {
                return undefined;
            }
            container = item;
        }
        const finalSegment = segments[segments.length - 1];
        if (!container.items.has(finalSegment)) {
            return undefined;
        }
        const value = container.items.get(finalSegment);
        if (value instanceof EncryptedFile) {
            const encryptedData = new EncryptedData(value.key, await downloadAndDecryptFile(value));
            return encryptedData;
        } else if (value instanceof EncryptionContainer) {
            return value;
        } else {
            return value;
        }
    }

    has(path: string): boolean {
        const segments = path.split('/');
        let value: AnyValueType = this;
        for (const segment of segments) {
            if (!(value instanceof EncryptionContainer)) {
                return false;
            }
            value = value.items.get(segment);
        }
        return value !== undefined;
    }

    async setPath(path: string, value: AnyValueType): Promise<void> {
        const segments = path.split('/');
        let container: EncryptionContainer = this;
        for (let i = 0; i < segments.length - 1; i++) {
            const segment = segments[i];
            if (!container.items.has(segment)) {
                container.items.set(segment, new EncryptionContainer());
                container.itemTypes.set(segment, ItemType.EncryptionContainer);
            }
            const subContainer = container.items.get(segment);
            if (!(subContainer instanceof EncryptionContainer)) {
                throw new DisplayableError('Cannot set path');
            }
            container = subContainer;
        }
        const finalSegment = segments[segments.length - 1];
        await container.set(finalSegment, value);
    }

    async getPath(path: string): Promise<AnyValueType> {
        const value = await this.get(path);
        if (value instanceof EncryptedFile) {
            return await downloadAndDecryptFile(value);
        } else if (value instanceof EncryptionContainer) {
            return value.toObject();
        } else {
            return value;
        }
    }

    async delete(path: string): Promise<boolean> {
        const segments = path.split('/');
        let container: EncryptionContainer = this;
        for (let i = 0; i < segments.length - 1; i++) {
            const segment = segments[i];
            if (!container.items.has(segment)) {
                return false;
            }
            const item = container.items.get(segment);
            if (!(item instanceof EncryptionContainer)) {
                return false;
            }
            container = item;
        }
        const finalSegment = segments[segments.length - 1];
        if (!container.items.has(finalSegment)) {
            return false;
        }
        container.items.delete(finalSegment);
        container.itemTypes.delete(finalSegment);
        return true;
    }

    toObject(): AnyValueType {
        const obj: ObjectWithAnyValues = {};
        for (const [k, v] of this.items) {
            if (v instanceof EncryptedFile) {
                obj[k] = v;
            } else if (v instanceof EncryptionContainer) {
                obj[k] = v.toObject();
            } else {
                obj[k] = v;
            }
        }
        return obj;
    }

    static deserializeFromJSON(json: string): EncryptionContainer {
        const obj = JSON.parse(json);
        const container = new EncryptionContainer();
        for (const k in obj) {
            const [key, type, fileId] = obj[k];
            if (type === ItemType.EncryptedFile) {
                container.items.set(k, new EncryptedFile(Buffer.from(key, 'hex'), fileId));
            } else if (type === ItemType.EncryptionContainer) {
                container.items.set(k, EncryptionContainer.deserializeFromJSON(JSON.stringify(fileId)));
            } else {
                container.items.set(k, fileId);
            }
            container.itemTypes.set(k, type);
        }
        return container;
    }

    serializeToJSON(): string {
        const obj: ObjectWithAnyValues = {};
        for (const [k, v] of this.items) {
            if (v instanceof EncryptedFile) {
                obj[k] = [v.key.toString('hex'), ItemType.EncryptedFile, v.fileId];
            } else if (v instanceof EncryptionContainer) {
                obj[k] = [null, ItemType.EncryptionContainer, v.toObject()];
            } else {
                obj[k] = [null, this.itemTypes.get(k), v];
            }
        }
        return JSON.stringify(obj);
    }
}

const ASYMMETRIC_ENCRYPTION_PROLOGUE_PLAIN = Buffer.from('PN^ENC\x05$\x06z\xf5*PLAIN');
const ASYMMETRIC_ENCRYPTION_PROLOGUE_ASYMM = Buffer.from('PN^ENC\x05$\x06z\xf5*ASYMM');
const ASYMMETRIC_ENCRYPTION_PROLOGUE_CONTAINER = Buffer.from('PN^ENC\x05$\x06z\xf5*CONT');
const ASYMMETRIC_ENCRYPTION_PROLOGUE_RAWASYMM = Buffer.from('PN^ENC\x05$\x06z\xf5*RAWASYMM');

export const encryptRawPlaintextAsymmetric = async (plaintext: Buffer, publicKey: Buffer): Promise<Buffer> => {
    // Prepare public key buffer
    const prefixedPublicKey = Buffer.concat([
        Buffer.from('04', 'hex'),
        publicKey
    ]);

    const {iv, ephemPublicKey, ciphertext, mac} = await eccrypto.encrypt(
        prefixedPublicKey,
        Buffer.concat([ASYMMETRIC_ENCRYPTION_PROLOGUE_PLAIN, plaintext])
    );

    const result = Buffer.concat([
        ASYMMETRIC_ENCRYPTION_PROLOGUE_RAWASYMM,
        Buffer.from('ffff', 'hex'),
        iv,
        Buffer.from('ffff', 'hex'),
        ephemPublicKey,
        Buffer.from('ffff', 'hex'),
        mac,
        Buffer.from('ffff', 'hex'),
        ciphertext
    ]);

    return result;
};

export const decryptRawPlaintextAsymmetric = async (encrypted: Buffer, privateKey: Buffer): Promise<Buffer> => {
    let offset = 0;

    const prologue = encrypted.slice(offset, offset + ASYMMETRIC_ENCRYPTION_PROLOGUE_RAWASYMM.byteLength);
    offset += ASYMMETRIC_ENCRYPTION_PROLOGUE_RAWASYMM.byteLength;

    if (!prologue.equals(ASYMMETRIC_ENCRYPTION_PROLOGUE_RAWASYMM)) {
        throw new DisplayableError('Decryption failed: invalid "rawasymm" prologue');
    }

    // check for 0xffff
    const ffff = encrypted.slice(offset, offset + 2);
    if (!ffff.equals(Buffer.from('ffff', 'hex'))) {
        throw new DisplayableError('Decryption failed: boundary not aligned');
    }
    offset += 2;

    const iv = encrypted.slice(offset, offset + 16);
    offset += 16;

    // check for 0xffff
    const ffff2 = encrypted.slice(offset, offset + 2);
    if (!ffff2.equals(Buffer.from('ffff', 'hex'))) {
        throw new DisplayableError('Decryption failed: boundary not aligned');
    }
    offset += 2;

    const ephemPublicKey = encrypted.slice(offset, offset + 65);
    offset += 65;

    // check for 0xffff
    const ffff3 = encrypted.slice(offset, offset + 2);
    if (!ffff3.equals(Buffer.from('ffff', 'hex'))) {
        throw new DisplayableError('Decryption failed: boundary not aligned');
    }
    offset += 2;

    const mac = encrypted.slice(offset, offset + 32);
    offset += 32;

    // check for 0xffff
    const ffff4 = encrypted.slice(offset, offset + 2);
    if (!ffff4.equals(Buffer.from('ffff', 'hex'))) {
        throw new DisplayableError('Decryption failed: boundary not aligned');
    }
    offset += 2;

    const ciphertext = encrypted.slice(offset);

    const decrypted = await eccrypto.decrypt(
        privateKey,
        {
            iv,
            ephemPublicKey,
            ciphertext,
            mac
        }
    );

    if (!decrypted.slice(0, ASYMMETRIC_ENCRYPTION_PROLOGUE_PLAIN.byteLength)
        .equals(ASYMMETRIC_ENCRYPTION_PROLOGUE_PLAIN)) {
        throw new DisplayableError('Decryption failed: decrypted data does not match prologue');
    }

    return decrypted.slice(ASYMMETRIC_ENCRYPTION_PROLOGUE_PLAIN.byteLength);
};

export const encryptAndUploadDataAsymmetric = async (
    host: string, data: Buffer, publicKey: Buffer, waitForUpload = true
): Promise<string> => {
    // First, encrypt the data with a random key and upload
    const symmetricallyEncryptedData = await encryptAndUploadData(data, waitForUpload);

    const symmetricKey = symmetricallyEncryptedData.key;
    const symmetricFileId = symmetricallyEncryptedData.fileId;

    const hostHashedBuf = await hashFn(Buffer.from(host));

    const dataToEncryptAsymmetrically = Buffer.concat([
        ASYMMETRIC_ENCRYPTION_PROLOGUE_ASYMM,
        symmetricKey,
        Buffer.from(symmetricFileId, 'hex'),
        hostHashedBuf
    ]);

    // check length
    const supposedLength = ASYMMETRIC_ENCRYPTION_PROLOGUE_ASYMM.byteLength + 32 + 32 + 32;
    if (dataToEncryptAsymmetrically.byteLength !== supposedLength) {
        throw new DisplayableError(`Data to encrypt asymmetrically has incorrect length`);
    }

    const encrypted = await encryptRawPlaintextAsymmetric(Buffer.from(dataToEncryptAsymmetrically), publicKey);

    const publicKeyHashed = await hashFn(publicKey);

    const final = Buffer.concat([
        ASYMMETRIC_ENCRYPTION_PROLOGUE_CONTAINER,
        publicKeyHashed,
        encrypted
    ]);

    return await uploadData(final, waitForUpload);
};

export const downloadAndDecryptDataAsymmetric = async (
    host: string, fileId: string, privateKey: Buffer
): Promise<Buffer> => {
    const downloaded = await getFileBinary(fileId);

    // check prologue
    if (!downloaded.slice(0, ASYMMETRIC_ENCRYPTION_PROLOGUE_CONTAINER.byteLength)
        .equals(ASYMMETRIC_ENCRYPTION_PROLOGUE_CONTAINER)) {
        throw new DisplayableError('Downloaded data does not have encryption container prologue');
    }

    const expectedPublicKeyHashed = downloaded.slice(
        ASYMMETRIC_ENCRYPTION_PROLOGUE_CONTAINER.byteLength,
        ASYMMETRIC_ENCRYPTION_PROLOGUE_CONTAINER.byteLength + 256 / 8);
    const publicKeyWith04 = await eccrypto.getPublic(privateKey);
    // Make sure it's 0x04
    if (publicKeyWith04[0] !== 0x04) {
        throw new DisplayableError('Public key isn\'t prefixed with 0x04');
    }
    const publicKey = publicKeyWith04.slice(1);
    const publicKeyHashed = await hashFn(publicKey);
    if (!expectedPublicKeyHashed.equals(publicKeyHashed)) {
        throw new DisplayableError('Downloaded data does not match expected public key');
    }

    // Get data
    const encryptedData = downloaded.slice(ASYMMETRIC_ENCRYPTION_PROLOGUE_CONTAINER.byteLength + 256 / 8);

    const decryptedKeyInfo = await decryptRawPlaintextAsymmetric(encryptedData, privateKey);

    // Check prologue
    if (!decryptedKeyInfo.slice(0, ASYMMETRIC_ENCRYPTION_PROLOGUE_ASYMM.byteLength)
        .equals(ASYMMETRIC_ENCRYPTION_PROLOGUE_ASYMM)) {
        throw new DisplayableError('Downloaded data does not have asymm encryption prologue');
    }

    const symmetricKey = decryptedKeyInfo.slice(
        ASYMMETRIC_ENCRYPTION_PROLOGUE_ASYMM.byteLength,
        ASYMMETRIC_ENCRYPTION_PROLOGUE_ASYMM.byteLength + 256 / 8);
    const symmetricFileId = decryptedKeyInfo.slice(
        ASYMMETRIC_ENCRYPTION_PROLOGUE_ASYMM.byteLength + 256 / 8,
        ASYMMETRIC_ENCRYPTION_PROLOGUE_ASYMM.byteLength + 256 / 8 + 256 / 8).toString('hex');
    const expectedHostHashed = decryptedKeyInfo.slice(
        ASYMMETRIC_ENCRYPTION_PROLOGUE_ASYMM.byteLength + 256 / 8 + 256 / 8);

    // Make sure nothing is left over
    if (decryptedKeyInfo.byteLength !== ASYMMETRIC_ENCRYPTION_PROLOGUE_ASYMM.byteLength + 256 / 8 + 256 / 8 + 256 / 8) {
        throw new DisplayableError('Downloaded data has unexpected extra bytes');
    }

    // Validate host
    const hostHashed = (await hashFn(Buffer.from(host)));
    if (!hostHashed.equals(expectedHostHashed)) {
        throw new DisplayableError('Downloaded data does not match expected host');
    }

    // Download and decrypt file
    return await downloadAndDecryptFile(new EncryptedFile(symmetricKey, symmetricFileId));
};

export const encryptAndUploadDataForIdentity = async (
    host: string, data: Buffer, identity: string, waitForUpload = true
): Promise<string> => {
    // Get public key
    const publicKey = Buffer.from((await ethereum.commPublicKeyByIdentity(identity)).replace('0x', ''), 'hex');

    // Check if it's 0x0
    if (publicKey.equals(Buffer.alloc(512 / 8)) || publicKey.byteLength === 0) {
        throw new DisplayableError('Empty public key');
    }
    // Validate public key
    if (publicKey.byteLength !== 512 / 8) {
        throw new DisplayableError('Invalid public key');
    }

    // Encrypt and upload
    return await encryptAndUploadDataAsymmetric(host, data, publicKey, waitForUpload);
};

export const signRawData = async (data: Buffer, privateKey: Buffer): Promise<Buffer> => {
    const hash = await hashFn(data);
    const signature = await eccrypto.sign(privateKey, hash);

    // as signature size is variable (DER format), we will fix it to 75 bytes and just left pad with 0xff
    const signatureFixed = Buffer.alloc(75);
    signatureFixed.fill(0xff);
    signature.copy(signatureFixed, 75 - signature.byteLength);

    return signatureFixed;
};

export const verifyRawData = async (data: Buffer, signature: Buffer, publicKey: Buffer): Promise<boolean> => {
    const hash = await hashFn(data);

    // recover signature in DER mode: read 0xff until we find 0x30 (start of DER signature)
    let i = 0;
    while (signature[i] === 0xff) {
        i++;
    }
    if (signature[i] !== 0x30) {
        throw new DisplayableError('Invalid signature');
    }
    const signatureDER = signature.slice(i);

    // Add the 0x04
    const publicKeyWith04 = Buffer.concat([Buffer.from([0x04]), publicKey]);

    // if the signature is invalid, eccrypto.verify will throw an error, otherwise null
    await eccrypto.verify(publicKeyWith04, hash, signatureDER);

    return true;
};

const SIGNATURE_PROLOGUE_INNER = Buffer.from('PN^SIGN\x05$\x06z\xf5*INNER', 'utf8');
const SIGNATURE_PROLOGUE_OUTER = Buffer.from('PN^SIGN\x05$\x06z\xf5*OUTER', 'utf8');

export const wrapWithSignature = async (host: string, data: Buffer, privateKey: Buffer): Promise<Buffer> => {
    const hashedHost = await hashFn(Buffer.from(host));

    // Get my identity
    const senderIdentity = (await getIdentity()).identity;
    if (!senderIdentity) {
        throw new DisplayableError('No identity found, cannot sign');
    }

    // Combine
    const combined = Buffer.concat([
        SIGNATURE_PROLOGUE_INNER,
        Buffer.from(senderIdentity, 'utf8'),
        Buffer.from([0x00]),
        hashedHost,
        data
    ]);

    // Sign
    const signature = await signRawData(combined, privateKey);

    // Todo: in the future, get my current public key and try to recover

    // Combine
    const final = Buffer.concat([
        SIGNATURE_PROLOGUE_OUTER,
        signature,
        combined
    ]);

    // Upload
    return final;
};

export type VerifiedData = {
    identity: string;
    host: string;
    data: Buffer;
};

export const downloadAndVerifySignature = async (
    host: string, fileIdOrBuffer: string|Buffer
): Promise<VerifiedData> => {
    const downloaded = typeof fileIdOrBuffer === 'string' ? await getFileBinary(fileIdOrBuffer) : fileIdOrBuffer;

    // Check prologue
    if (!downloaded.slice(0, SIGNATURE_PROLOGUE_OUTER.byteLength).equals(SIGNATURE_PROLOGUE_OUTER)) {
        throw new DisplayableError('Downloaded data does not have outer signature prologue');
    }

    // Get signature
    const signature = downloaded.slice(SIGNATURE_PROLOGUE_OUTER.byteLength, SIGNATURE_PROLOGUE_OUTER.byteLength + 75);

    // Get data
    const data = downloaded.slice(SIGNATURE_PROLOGUE_OUTER.byteLength + 75);

    // Check prologue
    if (!data.slice(0, SIGNATURE_PROLOGUE_INNER.byteLength).equals(SIGNATURE_PROLOGUE_INNER)) {
        throw new DisplayableError('Downloaded data does not have inner signature prologue');
    }

    // Get sender identity
    const senderIdentityEnd = data.indexOf(0x00, SIGNATURE_PROLOGUE_INNER.byteLength);
    const senderIdentity = data.slice(SIGNATURE_PROLOGUE_INNER.byteLength, senderIdentityEnd).toString('utf8');

    // Get host
    const expectedHostHashed = data.slice(senderIdentityEnd + 1, senderIdentityEnd + 1 + 256 / 8);
    const hostHashed = await hashFn(Buffer.from(host));
    if (!hostHashed.equals(expectedHostHashed)) {
        throw new DisplayableError('Downloaded data does not match expected host');
    }

    // Get data
    const dataWithoutPrologueIdentityAndHost = data.slice(senderIdentityEnd + 1 + 256 / 8);

    // Get public key
    const senderPublicKey = Buffer.from(
        (await ethereum.commPublicKeyByIdentity(senderIdentity)).replace('0x', ''), 'hex'
    );// todo: what happens with change of owner?

    // Check if it's 0x0
    if (senderPublicKey.equals(Buffer.alloc(512 / 8)) || senderPublicKey.byteLength === 0) {
        throw new DisplayableError('Empty public key');
    }
    // Validate public key
    if (senderPublicKey.byteLength !== 512 / 8) {
        throw new DisplayableError('Invalid public key');
    }

    // Verify
    if (!await verifyRawData(data, signature, senderPublicKey)) {
        throw new DisplayableError('Signature verification failed');
    }

    return {identity: senderIdentity, host, data: dataWithoutPrologueIdentityAndHost};
};

export const signEncryptUploadForIdentity = async (
    host: string, data: Buffer, identity: string, privateKey: Buffer, waitForUpload = true
): Promise<string> => {
    const signedPlaintext = await wrapWithSignature(host, data, privateKey);
    const encrypted = await encryptAndUploadDataForIdentity(host, signedPlaintext, identity, waitForUpload);
    return encrypted;
};

export const signEncryptUploadForIdentityFromMe = async (
    host: string, data: Buffer, identity: string, waitForUpload = true
): Promise<string> => {
    // Get private key
    const privateKey = getNetworkPrivateKey();

    return await signEncryptUploadForIdentity(
        host, data, identity, Buffer.from(privateKey, 'hex'), waitForUpload
    );
};

export const downloadVerifyDecryptFromIdentity = async (
    host: string, fileId: string, privateKey: Buffer
): Promise<VerifiedData> => {
    const decrypted = await downloadAndDecryptDataAsymmetric(host, fileId, privateKey);
    const extracted = await downloadAndVerifySignature(host, decrypted);
    return extracted;
};

export const downloadVerifyDecryptFromIdentityForMe = async (host: string, fileId: string): Promise<VerifiedData> => {
    // Get private key
    const privateKey = getNetworkPrivateKey();

    return await downloadVerifyDecryptFromIdentity(host, fileId, Buffer.from(privateKey, 'hex'));
};

// export const testEncryption = async () => {
//
//     // const res = await getNetworkPrivateSubKey('Hello');
//     // console.log({res})
//     // const res2 = await getNetworkPrivateSubKey('Hello2');
//     // console.log({res2})
//     //
//     // console.log('get', await hostStorageGet('test.point', []));
//     //
//     // await hostStorageModify('test.point', ['hello'], 'world', MODIFY_TYPE.SET);
//
//     return ;
//
//     // test signature and encryption
//     const host = 'test';
//     const data = Buffer.from('test data', 'utf8');
//     const identity = 'newcontinuetest';
//     // const privateKey = await eccrypto.generatePrivate();
//     // const publicKeyWith04 = await eccrypto.getPublic(privateKey);
//     const result = await signEncryptUploadForIdentityFromMe(host, data, identity);
//
//     const decryption = await downloadVerifyDecryptFromIdentityForMe(host, result);
//
//     // console.log(decryption.toString('utf8'));
//
//     //
//     // // test identity encryption
//     // const host = 'test';
//     // const data = Buffer.from('test data', 'utf8');
//     // const privateKey = await eccrypto.generatePrivate();
//     // const publicKeyWith04 = await eccrypto.getPublic(privateKey);
//     //
//     // // remove 04
//     // const publicKey = publicKeyWith04.slice(1);
//     //
//     // console.log('public key', publicKey.toString('hex'));
//     // console.log('private key', privateKey.toString('hex'));
//     //
//     // const encrypted = await encryptAndUploadDataAsymmetric(host, data, publicKey);
//     //
//     // console.log('encrypted', encrypted);
//     //
//     // const decrypted = await downloadAndDecryptDataAsymmetric(host, encrypted, privateKey);
//     //
//     // console.log('decrypted', decrypted.toString('utf8'));
//     //
//     // // make sure it matches
//     // if (!data.equals(decrypted)) {
//     //     throw new DisplayableError('Decrypted data does not match original data');
//     // } else {
//     //     console.log('Encryption test passed');
//     // }
//     //
//     return;
//
//     // create a new container
//     const container = new EncryptionContainer();
//
//     // set some values at various paths in the container
//     await container.setPath('foo', 'bar');
//     await container.setPath('baz.qux', 'quux');
//     await container.setPath('nested', { a: 1, b: 2, c: { d: 3 } });
//
//     // check that the values were set correctly
//     console.log(await container.get('foo')); // should print "bar"
//     console.log(await container.get('baz.qux')); // should print "quux"
//     console.log(await container.get('nested.a')); // should print 1
//     console.log(await container.get('nested.c.d')); // should print 3
//
//     // check that a non-existent path returns undefined
//     console.log(await container.get('nonexistent.path')); // should print undefined
//
//     // check that has method returns true for existing paths and false for non-existent paths
//     console.log(container.has('foo')); // should print true
//     console.log(container.has('baz.qux')); // should print true
//     console.log(container.has('nested.a')); // should print true
//     console.log(container.has('nonexistent.path')); // should print false
//
//     // delete a value at a specific path
//     console.log(await container.delete('baz.qux')); // should print true
//     console.log(container.has('baz.qux')); // should print false
//
//     console.log(await container.getPath('foo')); // should print "bar"
//     console.log(await container.getPath('baz.qux')); // should print "quux"
//     console.log(await container.getPath('nested.a')); // should print 1
//     console.log(await container.getPath('nested.c.d')); // should print 3
//     console.log(await container.getPath('encrypted')); // should print the decrypted value of the encrypted file at the 'encrypted' path, if one exists
//     console.log(await container.getPath('nonexistent.path')); // should print undefined
// };
