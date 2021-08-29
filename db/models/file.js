const crypto = require('crypto');
const Model = require('../model');
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
let Chunk;

class File extends Model {
    constructor(...args) {
        super(...args);

        // This is to avoid circular dependencies:
        Chunk = require('./chunk');

        this._merkleTree = null;
        this._fileHash = null; // todo: remove
    }

    getAllChunkIds() {
        if (! this.chunkIds) {
            throw Error('You need to chunkify the file first before calculating a merkle tree');
        }
        console.log(this.chunkIds);
        return [...this.chunkIds, this.id];
    }

    getMerkleHash() {
        let tree = this.getMerkleTree();
        return tree[tree.length-1];
    }
    getMerkleHashHex() {
        return this.getMerkleHash().toString('hex');
    }

    getMerkleTree() {
        // todo: https://en.wikipedia.org/wiki/Merkle_tree#Second_preimage_attack
        // todo: https://crypto.stackexchange.com/questions/2106/what-is-the-purpose-of-using-different-hash-functions-for-the-leaves-and-interna
        // todo: https://crypto.stackexchange.com/questions/43430/what-is-the-reason-to-separate-domains-in-the-internal-hash-algorithm-of-a-merkl

        if (this._merkleTree === null) {
            if (! this.chunkIds) {
                throw Error('You need to chunkify the file first before calculating a merkle tree');
            }

            let chunks = this.chunkIds.map(x => Buffer.from(x, 'hex'));
            this._merkleTree = this.ctx.utils.merkle.merkle(chunks, this.ctx.utils.hashFn);
        }

        return this._merkleTree;
    }
    getMerkleTreeHex() {
        return this.getMerkleTree().map(x => x.toString('hex'));
    }

    setChunkInfo(chunkInfo) {
        if (Buffer.isBuffer(chunkInfo)) {
            chunkInfo = chunkInfo.toString();
        }

        let {type, hash, chunks, filesize, merkle} = JSON.parse(chunkInfo); // todo: rename hash to hash-algo or something, confusing

        if (type !== 'file') {
            throw Error('main chunk is not of type "file"');
            // todo: error? ignore?
        }

        if (hash !== 'keccak256') {
            // todo: error? ignore?
        }
        let merkleReassembled = this.ctx.utils.merkle.merkle(chunks.map(x => Buffer.from(x, 'hex')), this.ctx.utils.hashFn).map(x => x.toString('hex'));
        if (!this.ctx.utils.areScalarArraysEqual(merkleReassembled, merkle)) {
            // todo: error? ignore?
            return console.error('MERKLE INCORRECT!', {merkleReassembled, merkle, hash, chunks});
        }

        this.chunkIds = chunks;
        this.size = filesize;
    }

    async dumpToDiskFromChunks() {
        if (typeof this.size === 'undefined' || this.size === null) {
            throw Error('File size is not set, thus impossible to validate');
            // todo: fatal error or ignore?
        }

        let temporaryFile = '/tmp/_point_tmp_'+Math.random().toString().replace('.', ''); // todo;
        let fd = fs.openSync(temporaryFile, 'a');

        for(let chunkId of this.chunkIds) {
            let chunk = await Chunk.findOrFail(chunkId);

            // todo: what if getData() returns empty? maybe hash again, just to be sure?
            // todo: make sure data is Buffer
            let data = chunk.getData();
            if (!Buffer.isBuffer(data)) throw Error('File.dumpToDiskFromChunks: data must be a Buffer');
            if (this.ctx.utils.hashFnHex(data) !== chunk.id) throw Error('Chunk hash doesn\'t match data'); // todo should we throw error or just ignore and return?

            if (chunkId === this.chunkIds[this.chunkIds.length-1]) {
                const CHUNK_SIZE_BYTES = this.ctx.config.storage.chunk_size_bytes;
                const chunkNo = this.chunkIds.length-1;
                const bytesBeforeChunk = chunkNo * CHUNK_SIZE_BYTES;
                const chunkLength = this.size - bytesBeforeChunk;

                let buf = Buffer.alloc(chunkLength);
                data.copy(buf, 0, 0, chunkLength);

                fs.appendFileSync(fd, buf, { encoding: null });
            } else {
                fs.appendFileSync(fd, data, { encoding: null });
            }
        }

        fs.closeSync(fd);

        if (fs.statSync(temporaryFile).size !== this.size) {
            throw Error('File size doesn\'t match with the one in the chunkinfo after reassembly');
            // todo: fatal error or ignore?
        }

        // todo: check full file integrity
        fs.copyFileSync(temporaryFile, this.original_path);
        fs.unlinkSync(temporaryFile);
    }

    // todo: make use of it
    async getFileHash() {
        if (this._fileHash === null) {
            let hash = crypto.createHash('sha256');

            return new Promise((resolve, reject) => {
                fs.createReadStream(filepath)
                    .on('data', (chunk) => {
                        hash.update(chunk);
                    })
                    .on('end', () => {
                        this._fileHash = hash.digest('hex');
                        resolve(this._fileHash);
                    })
                    .on('error', reject);
            });
        } else {
            return this._fileHash;
        }
    }

    getFileSize() {
        if (typeof this.size === 'undefined') {
            this.size = fs.statSync(this.original_path).size;
        }
        return this.size;
    }

    async reconsiderUploadingStatus() {
        const chunks = await this.getAllChunks(); // todo: not important, but consider getting ids at this point, and objs only in the cycle?
        let chunks_uploading = 0;
        const CHUNK_SIZE_BYTES = this.ctx.config.storage.chunk_size_bytes;
        await Promise.all(chunks.map(async(chunk, i) => {
            chunk.redundancy = Math.max(parseInt(chunk.redundancy)||0, this.redundancy);
            chunk.expires = Math.max(parseInt(chunk.expires)||0, this.expires);
            chunk.autorenew = (!!chunk.autorenew) ? !!chunk.autorenew : !!this.autorenew;
            await chunk.save();
            await chunk.addBelongsToFile(this, i * CHUNK_SIZE_BYTES);
            await chunk.reconsiderUploadingStatus(false);
            if (chunk.isUploading()) {
                chunks_uploading++; // todo: replace with needs_uploading and break;
            }
        }));

        // let percentage = chunks_uploading / chunks.length;
        // console.log("file: "+this.original_path+": "+"█".repeat(percentage)+".".repeat(100-percentage));

        await this.changeULStatus((chunks_uploading > 0) ? File.UPLOADING_STATUS_UPLOADING : File.UPLOADING_STATUS_UPLOADED);
    }

    async reconsiderDownloadingStatus(cascade) {
        const chunkinfo_chunk = await Chunk.findOrCreate(this.id);
        if (chunkinfo_chunk.dl_status === Chunk.DOWNLOADING_STATUS_FAILED) {
            await this.changeDLStatus(File.DOWNLOADING_STATUS_FAILED);
            await this.save();
            return;
        } else if (chunkinfo_chunk.dl_status !== Chunk.DOWNLOADING_STATUS_DOWNLOADED) {
            await chunkinfo_chunk.save();
            await chunkinfo_chunk.addBelongsToFile(this, -1);
            await chunkinfo_chunk.changeDLStatus(Chunk.DOWNLOADING_STATUS_DOWNLOADING);
            await this.changeDLStatus(File.DOWNLOADING_STATUS_DOWNLOADING_CHUNKINFO);
            setImmediate(async() => {
                await this.ctx.client.storage.chunkDownloadingTick(chunkinfo_chunk);
            });
            return;
        } // else chunk info downloaded

        if (! this.chunkIds) {
            this.setChunkInfo(chunkinfo_chunk.getData().toString('utf-8'));
            await this.save();
        }

        const chunks = await this.getAllChunks(); // todo: not important, but consider getting ids at this point, and objs only in the cycle?
        let needs_downloading = false;
        await Promise.all(chunks.map(async(chunk, i) => {
            await chunk.reconsiderDownloadingStatus(false);
            if (chunk.dl_status === Chunk.DOWNLOADING_STATUS_FAILED) {
                await this.changeDLStatus(File.DOWNLOADING_STATUS_FAILED);
                await this.save();
                return;
            }
            if (chunk.dl_status !== Chunk.DOWNLOADING_STATUS_DOWNLOADED) {
                needs_downloading = true;

                const CHUNK_SIZE_BYTES = this.ctx.config.storage.chunk_size_bytes;
                await chunk.save();
                await chunk.addBelongsToFile(this, i * CHUNK_SIZE_BYTES);
                await chunk.changeDLStatus(Chunk.DOWNLOADING_STATUS_DOWNLOADING);

                setImmediate(async() => {
                    await this.ctx.client.storage.chunkDownloadingTick(chunk);
                });
            }
        }));

        if (needs_downloading) {
            await this.changeDLStatus(File.DOWNLOADING_STATUS_DOWNLOADING);
        } else {
            let current_status = this.dl_status;
            if (current_status !== File.DOWNLOADING_STATUS_DOWNLOADED) {
                await this.dumpToDiskFromChunks();
            }
            await this.changeDLStatus(File.DOWNLOADING_STATUS_DOWNLOADED);
        }
    }

    async changeULStatus(status) {
        if (this.ul_status === status) return;
        this.ul_status = status;
        await this.save();
    }
    async changeDLStatus(status) {
        if (this.dl_status === status) return;
        this.dl_status = status;
        await this.save();
    }

    async getAllChunks() {
        const ids = this.getAllChunkIds();
        return await Promise.all(ids.map(async(id) => {
            return await Chunk.findOrCreate(id);
        }));
    }

    getData(encoding = null) {
        // todo: check if all chunks downloaded
        if (this.dl_status === File.DOWNLOADING_STATUS_FAILED) {
            // throw new Error('EFILEDLFAILED: File failed to download');// todo: shouldn't we throw the error here?
            return undefined;
        }
        if (this.dl_status !== File.DOWNLOADING_STATUS_DOWNLOADED) throw new Error('EFILESTATUSNOTDONE: File has not yet been downloaded');
        return fs.readFileSync(this.original_path, encoding);
    }

    async chunkify() {
        if (! this.chunkIds) {
            const CHUNK_SIZE_BYTES = this.ctx.config.storage.chunk_size_bytes;
            const size = this.getFileSize();
            const totalChunks = Math.ceil(size / CHUNK_SIZE_BYTES);

            return new Promise((resolve, reject) => {
                let chunks = [];
                let currentChunk = Buffer.alloc(CHUNK_SIZE_BYTES);
                let currentChunkLength = 0;
                let chunkId = null;

                fs.createReadStream(this.original_path)
                    .on('data', (buf) => {
                        let bufCopied = 0;

                        while (currentChunkLength + buf.length - bufCopied >= CHUNK_SIZE_BYTES) {
                            let copyLength = CHUNK_SIZE_BYTES - currentChunkLength;
                            buf.copy(currentChunk, currentChunkLength, bufCopied, bufCopied + copyLength);
                            bufCopied += copyLength;
                            currentChunkLength += copyLength;
                            chunkId = Chunk.forceSaveToDisk(currentChunk);
                            chunks.push(chunkId);
                            currentChunk = Buffer.alloc(CHUNK_SIZE_BYTES);
                            currentChunkLength = 0;
                        }

                        buf.copy(currentChunk, currentChunkLength, bufCopied, buf.length);
                        currentChunkLength += (buf.length-bufCopied);
                    })
                    .on('end', () => {
                        if (currentChunkLength !== 0) {
                            currentChunk = currentChunk.slice(0, currentChunkLength);
                            chunkId = Chunk.forceSaveToDisk(currentChunk);
                            chunks.push(chunkId);
                        }

                        if (chunks.length !== totalChunks) {
                            return reject('Something went wrong, totalChunks '+totalChunks+' didn\'t match chunks.length '+chunks.length);
                        }

                        this.chunkIds = chunks;

                        (async() => {
                            let merkleTree = await this.getMerkleTree();
                            let mainChunkContents = JSON.stringify({
                                type: 'file',
                                chunks: chunks,
                                hash: 'keccak256',
                                filesize: this.getFileSize(),
                                merkle: merkleTree.map(x => x.toString('hex')),
                            });

                            let mainChunkContentsBuffer = Buffer.from(mainChunkContents, 'utf-8');  // todo: sure it's utf8? buffer uses utf8 by default anyway when casting. but what about utf16?
                            let chunk = await Chunk.findOrCreateByData(mainChunkContentsBuffer);
                            this.id = chunk.id;
                            const alreadyExistingFile = await File.findByPk(this.id);
                            if (alreadyExistingFile) {
                                // A file with this id already exists! This changes everything
                                // TODO: figure out how to merge redundancy, expires, autorenew etc.
                                if (alreadyExistingFile.ul_status !== File.UPLOADING_STATUS_UPLOADING &&
                                    alreadyExistingFile.ul_status !== File.UPLOADING_STATUS_UPLOADED)
                                {
                                    alreadyExistingFile.ul_status = File.UPLOADING_STATUS_UPLOADING;
                                    await alreadyExistingFile.changeULStatusOnAllChunks(Chunk.UPLOADING_STATUS_UPLOADING);
                                    await alreadyExistingFile.save();
                                }
                            } else {
                                await this.save();
                            }

                            chunk.setData(mainChunkContentsBuffer);
                            chunk.size = Buffer.byteLength(mainChunkContentsBuffer);
                            chunk.dl_status = Chunk.DOWNLOADING_STATUS_CREATED;
                            chunk.redundancy = this.redundancy;
                            chunk.expires = this.expires;
                            chunk.autorenew = this.autorenew;
                            chunk.ul_status = Chunk.UPLOADING_STATUS_UPLOADING;
                            await chunk.save();
                            await chunk.addBelongsToFile(this, -1);

                            for (let i in chunks) {
                                let chunkId = chunks[i];

                                // no await needed, let them be free
                                (async (i, chunkId) => {
                                    let chunk = await Chunk.findOrCreate(chunkId);
                                    let offset = i * CHUNK_SIZE_BYTES;
                                    chunk.ul_status = Chunk.UPLOADING_STATUS_UPLOADING;
                                    chunk.dl_status = Chunk.DOWNLOADING_STATUS_CREATED;
                                    chunk.size = chunk.getSize();
                                    chunk.redundancy = this.redundancy;
                                    chunk.expires = this.expires;
                                    chunk.autorenew = this.autorenew;
                                    await chunk.save();
                                    await chunk.addBelongsToFile(this, offset);
                                })(i, chunkId).then(nothing => {});
                            }

                            resolve(this.chunkIds);
                        })();
                    })
                    .on('error', reject);
            });
        } else {
            return this.chunkIds;
        }
    }

    async changeULStatusOnAllChunks() {
        const chunkIds = this.getAllChunkIds();
        for (let i in chunkIds) {
            const chunkId = chunkIds[i];
            // no await needed, let them be free
            (async (i, chunkId) => {
                let chunk = await Chunk.findByPk(chunkId);
                if (chunk.ul_status !== Chunk.UPLOADING_STATUS_UPLOADING && chunk.ul_status !== Chunk.UPLOADING_STATUS_UPLOADED) {
                    chunk.ul_status = Chunk.UPLOADING_STATUS_UPLOADING;
                    await chunk.save();
                }
            })(i, chunkId).then(nothing => {});
        }
    }
}

File.init({
    id: { type: Sequelize.DataTypes.STRING, unique: true, primaryKey: true },
    original_path: { type: Sequelize.DataTypes.TEXT },
    size: { type: Sequelize.DataTypes.INTEGER },
    chunkIds: { type: Sequelize.DataTypes.JSON, allowNull: true },

    ul_status: { type: Sequelize.DataTypes.STRING },
    dl_status: { type: Sequelize.DataTypes.STRING },

    redundancy: { type: Sequelize.DataTypes.INTEGER },
    expires: { type: Sequelize.DataTypes.BIGINT },
    autorenew: { type: Sequelize.DataTypes.BOOLEAN },

}, {
    indexes: [
        { fields: ['ul_status'] },
        { fields: ['dl_status'] },
    ]
});


File.UPLOADING_STATUS_CREATED = 'us0';
File.UPLOADING_STATUS_UPLOADING = 'us1';
File.UPLOADING_STATUS_UPLOADED = 'us99';
File.DOWNLOADING_STATUS_CREATED = 'ds0';
File.DOWNLOADING_STATUS_DOWNLOADING_CHUNKINFO = 'ds1';
File.DOWNLOADING_STATUS_DOWNLOADING = 'ds2';
File.DOWNLOADING_STATUS_DOWNLOADED = 'ds99';
File.DOWNLOADING_STATUS_FAILED = 'ds3';

module.exports = File;
