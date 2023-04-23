const zlib = require('zlib');

const PN_GZIP_PROLOGUE = 'PN^GZ\x05\x06*#';

export const gzip = async(data: string, addPrologue = false) => new Promise((resolve, reject) => {
    zlib.gzip(data, (err: Error|null, compressed: Buffer) => {
        if (err) reject(err);
        resolve((addPrologue) ? Buffer.concat([Buffer.from(PN_GZIP_PROLOGUE), compressed]) : compressed);
    });
});

export const gunzip = async(data: Buffer, verifyPrologue = false) => new Promise((resolve, reject) => {
    if (verifyPrologue) {
        const prologue = data.slice(0, PN_GZIP_PROLOGUE.length).toString();
        if (prologue !== PN_GZIP_PROLOGUE) {
            reject(new Error('Invalid prologue'));
        }
        data = data.slice(PN_GZIP_PROLOGUE.length);
    }

    zlib.gunzip(data, (err: Error|null, uncompressed: Buffer) => {
        if (err) reject(err);
        resolve(uncompressed);
    });
});

export const gunzipIfCompressed = async(data: Buffer) => {
    if (data.slice(0, PN_GZIP_PROLOGUE.length).toString() === PN_GZIP_PROLOGUE) {
        return gunzip(data, true);
    }
    return data;
};
