const crypto = require('crypto');
const mkdirp = require('mkdirp');
const ethUtil = require('ethereumjs-util');
const {promises: fs} = require('fs');
const kadUtils = require('@pointnetwork/kadence').utils;
const os = require('os');

const utils = {
    makeSurePathExists: function (path) {
        try {
            mkdirp.sync(path);
        } catch (err) {
            if (err.code !== 'EEXIST') throw err;
        }
    },

    // todo: ok, this has to do with point signatures, but why not use the same keccak256 to be fully compatible with everything else?
    sha256: function (data) {
        return crypto.createHash('sha256').update(data).digest();
    },
    sha256hex: function (data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    },

    // todo: make sure you're actually using the same function solidity does: https://ethereum.stackexchange.com/a/48846
    hashFn: function (buf) {
        return Buffer.from(ethUtil.keccak256(buf), 'hex'); //.slice(-20);
    },
    hashFnHex: function (buf) {
        return this.hashFn(buf).toString('hex');
    },
    utf8toBuffer: function (v) {
        if (Buffer.isBuffer(v)) return v;
        return Buffer.from(v, 'utf8');
    },
    hashFnUtf8Hex: function (value) {
        return this.hashFnHex(this.utf8toBuffer(value));
    },

    xorBuffersInPlace: function (a, b) {
        const length = Math.min(a.length, b.length);
        for (let i = 0; i < length; ++i) {
            a[i] = a[i] ^ b[i];
        }
        return a;
    },

    areScalarArraysEqual: function (a1, a2) {
        // todo: i feel like there could be some vulnerability hidden here... create more robust function but fast, without overhead of JSON.stringify
        if (typeof a1 !== typeof a2) return false;
        if (typeof a1 !== 'object') return false;
        if (a1.length !== a2.length) return false;
        for (const i in a1) {
            if (a1[i] !== a2[i]) return false;
        }
        return true;
    },

    // todo: refactor out signature related functions, into a separate clase
    pointSign: function (message, privateKey, chainId) {
        const fullMessage = this.pointConstructFullMessageToSign(message);

        if (!privateKey) throw Error('no private key passed to pointSign');

        const signature = ethUtil.ecsign(
            this.sha256(Buffer.from(fullMessage, 'utf-8')),
            privateKey,
            chainId
        );
        return signature;
    },
    pointConstructFullMessageToSign: function (message) {
        let sanitizedMessage;

        if (typeof message === 'string') {
            if (/\|/.test(message)) throw Error('message cannot contain delimiters');
            sanitizedMessage = message;
        } else if (Array.isArray(message)) {
            for (const v of message) {
                if (/\|/.test(v)) throw Error('message arguments cannot contain delimiters');
            }
            sanitizedMessage = message.join('|');
        } else {
            throw Error('Unknown');
        }

        return 'POINT|' + sanitizedMessage; // todo: versioning, chainId+ etc
    },
    verifyPointSignature: function (signedMessage, vrs, publicKey, chainId) {
        const fullMessage = this.pointConstructFullMessageToSign(signedMessage);

        const {v, r, s} = vrs;

        const pubkeyRecovered = ethUtil.ecrecover(
            this.sha256(Buffer.from(fullMessage, 'utf-8')),
            v,
            r,
            s,
            chainId
        );
        const addressRecovered = publicKey.slice(-20);
        if (
            addressRecovered.toString('hex') !== publicKey.toString('hex') ||
            pubkeyRecovered.length !== 64
        ) {
            return false;
        }
        return true;
    },
    serializeSignature: function (vrs) {
        return JSON.stringify({
            v: vrs.v.toString(),
            r: vrs.r.toString('base64'),
            s: vrs.s.toString('base64')
        });
    },
    deserializeSignature: function (obj) {
        try {
            const parsed = JSON.parse(obj);
            return {
                v: parseInt(parsed.v),
                r: Buffer.from(parsed.r, 'base64'),
                s: Buffer.from(parsed.s, 'base64')
            };
        } catch (e) {
            return {v: null, r: null, s: null}; // todo: or maybe throw error?
        }
    },

    iterableFlat: function (x) {
        const results = [];
        for (const y of x) {
            for (const z of y) {
                results.push(z);
            }
        }
        return results;
    },

    urlToContact: function (str) {
        return kadUtils.parseContactURL(str);
    },

    nullAsyncFn: async function () {}, // todo: can you replace it with just await null?

    escape: function (dangerousString) {
        const encode = require('html-entities').encode;
        return encode(dangerousString);
    },

    nl2br: function (text) {
        return text.replace(/\n/g, '<br>');
    },

    delay: ms =>
        new Promise(resolve => {
            setTimeout(resolve, ms);
        }),

    // TODO: replace the old func
    makeSurePathExistsAsync: async folderPath => {
        try {
            await fs.stat(folderPath);
        } catch (e) {
            if (e.code === 'ENOENT') {
                await fs.mkdir(folderPath, {recursive: true});
            } else {
                throw e;
            }
        }
    },

    resolveHome: (filepath) => {
        if (filepath[0] === '~') {
            return path.join(process.env.HOME || os.homedir(), filepath.slice(1));
        }
        return filepath;
    }

};

utils.merkle = require('./merkle-utils');

module.exports = utils;
