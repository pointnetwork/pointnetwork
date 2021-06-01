const crypto = require('crypto');
const mkdirp = require('mkdirp');
const ethUtil = require('ethereumjs-util');
const kadUtils = require('@pointnetwork/kadence').utils;

class Utils {
    static makeSurePathExists(path) {
        try {
            mkdirp.sync(path)
        } catch (err) {
            if (err.code !== 'EEXIST') throw err
        }
    }

    // todo: ok, this has to do with point signatures, but why not use the same keccak256 to be fully compatible with everything else?
    static sha256(data) {
        return crypto.createHash('sha256').update(data).digest();
    }
    static sha256hex(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    // todo: make sure you're actually using the same function solidity does: https://ethereum.stackexchange.com/a/48846
    static hashFn(value) {
        return Buffer.from(ethUtil.keccak256(value), 'hex'); //.slice(-20);
    }
    static hashFnHex(value) {
        return this.hashFn(value).toString('hex');
    }

    static xorBuffersInPlace(a, b) {
        var length = Math.min(a.length, b.length);
        for (var i = 0; i < length; ++i) {
            a[i] = a[i] ^ b[i];
        }
        return a;
    }

    static areScalarArraysEqual(a1, a2) {
        // todo: i feel like there could be some vulnerability hidden here... create more robust function but fast, without overhead of JSON.stringify
        if (typeof a1 !== typeof a2) return false;
        if (typeof a1 !== 'object') return false;
        if (a1.length !== a2.length) return false;
        for(let i in a1) {
            if (a1[i] !== a2[i]) return false;
        }
        return true;
    }

    // todo: refactor out signature related functions, into a separate clase
    static pointSign(message, privateKey, chainId) {
        const fullMessage = this.pointConstructFullMessageToSign(message);

        if (!privateKey) throw Error('no private key passed to pointSign');

        const signature = ethUtil.ecsign(
            this.sha256(Buffer.from(fullMessage, 'utf-8')),
            privateKey,
            chainId
        );
        return signature;
    }
    static pointConstructFullMessageToSign(message) {
        let sanitizedMessage;

        if (typeof message === 'string') {
            if (/\|/.test(message)) throw Error('message cannot contain delimiters');
            sanitizedMessage = message;
        } else if (Array.isArray(message)) {
            for(let v of message) {
                if (/\|/.test(v)) throw Error('message arguments cannot contain delimiters');
            }
            sanitizedMessage = message.join('|');
        } else {
            throw Error('Unknown')
        }

        return 'POINT|' + sanitizedMessage; // todo: versioning, chainId+ etc
    }
    static verifyPointSignature(signedMessage, vrs, publicKey, chainId) {
        let fullMessage = this.pointConstructFullMessageToSign(signedMessage);


        const {v,r,s} = vrs;

        const pubkeyRecovered = ethUtil.ecrecover(this.sha256(Buffer.from(fullMessage, 'utf-8')), v, r, s, chainId);
        const addressRecovered = publicKey.slice(-20);
        if (addressRecovered.toString('hex') !== publicKey.toString('hex') || pubkeyRecovered.length !== 64) {
            return false;
        }
        return true;
    }
    static serializeSignature(vrs) {
        return JSON.stringify({v: vrs.v.toString(), r: vrs.r.toString('base64'), s: vrs.s.toString('base64')});
    }
    static deserializeSignature(obj) {
        try {
            const parsed = JSON.parse(obj);
            return { v: parseInt(parsed.v), r: Buffer.from(parsed.r, 'base64'), s: Buffer.from(parsed.s, 'base64') };
        } catch(e) {
            return {v:null, r:null, s:null}; // todo: or maybe throw error?
        }
    }

    static iterableFlat(x) {
        let results = [];
        for(let y of x) {
            for(let z of y) {
                results.push(z);
            }
        }
        return results;
    }

    static urlToContact(str) {
        return kadUtils.parseContactURL(str);
    }

    static async nullAsyncFn() {} // todo: can you replace it with just await null?

    static htmlspecialchars(dangerousString) {
        const encode = require('html-entities').encode;
        return encode(dangerousString);
    }
}

Utils.merkle = require('./merkle-utils');

module.exports = Utils;