const crypto = require('crypto');
const Model = require('../model');
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const _ = require('lodash');
const utils = require('#utils');
let Chunk;
let FileMap;

class File extends Model {
    CHUNKINFO_PROLOGUE = "PN^CHUNK\x05$\x06z\xf5*INFO"; // A very unlikely combination. In your probability reasoning, note that it must appear strictly at the beginning, not randomly

    constructor(...args) {
        super(...args);

        // This is to avoid circular dependencies:
        Chunk = require('./chunk');
        FileMap = require('./file_map');

        this._merkleTree = null;
        this._fileHash = null; // todo: remove

        this.cache_path = 'data/dl_files';
    }

    getAllChunkIds() {
        if (! this.chunkIds) {
            console.log({file:this});
            console.trace();
            throw Error('You need to chunkify the file first before calculating a merkle tree');
        }
        return [...this.chunkIds, this.id];
    }

    static async getAllContainingChunkId(chunk_id) {
        const maps = await FileMap.allBy('chunk_id', chunk_id);
        let file_ids = [];
        for(let map of maps) {
            file_ids.push(map.file_id);
        }
        file_ids = _.uniq(file_ids);
        console.log({file_ids});

        let files = [];
        for(let file_id of file_ids) {
            files.push(await File.findOrFail(file_id));
        }

        return files;
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
            this._merkleTree = utils.merkle.merkle(chunks, utils.hashFn);
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

        if (! _.startsWith(chunkInfo, this.CHUNKINFO_PROLOGUE)) {
            throw Error('File.setChunkInfo: data does not start with a known chunkinfo_prologue');
        }

        let {type, hash, chunks, filesize, merkle} = JSON.parse(chunkInfo.substr(this.CHUNKINFO_PROLOGUE.length)); // todo: rename hash to hash-algo or something, confusing

        if (type !== 'file') {
            throw Error('main chunk is not of type "file"');
            // todo: error? ignore?
        }

        if (hash !== 'keccak256') {
            // todo: error? ignore?
        }
        let merkleReassembled = utils.merkle.merkle(chunks.map(x => Buffer.from(x, 'hex')), utils.hashFn).map(x => x.toString('hex'));
        if (!utils.areScalarArraysEqual(merkleReassembled, merkle)) {
            // todo: error? ignore?
            return console.error('MERKLE INCORRECT!', {merkleReassembled, merkle, hash, chunks});
        }

        this.chunkIds = chunks;
        this.size = filesize;
    }

    getStoragePath() {
        const cache_dir = path.join(this.ctx.datadir, this.cache_path);
        utils.makeSurePathExists(cache_dir);
        return path.join(cache_dir, 'file_dl_'+this.id);
    }

    async dumpToDiskFromChunks() {
        if (typeof this.size === 'undefined' || this.size === null) {
            throw Error('File size is not set, thus impossible to validate');
            // todo: fatal error or ignore?
        }

        let temporaryFile = '/tmp/_point_tmp_'+Math.random().toString().replace('.', ''); // todo;
        let fd = fs.openSync(temporaryFile, 'a');

        console.log('DUMP_TO_DISK_FROM_CHUNKS', this.id, this.chunkIds);

        for(let chunkId of this.chunkIds) {
            let chunk = await Chunk.findOrFail(chunkId);

            // todo: what if getData() returns empty? maybe hash again, just to be sure?
            // todo: make sure data is Buffer
            let data = chunk.getData();
            if (!Buffer.isBuffer(data)) throw Error('File.dumpToDiskFromChunks: data must be a Buffer');
            if (utils.hashFnHex(data) !== chunk.id) throw Error('Chunk hash doesn\'t match data'); // todo should we throw error or just ignore and return?

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

            console.dir({chunk, chunks, chunks_uploading}, {depth: 3});
            for(let i in chunks) {
                console.log(i, chunks[i].dataValues);
            }
        }));

        // let percentage = chunks_uploading / chunks.length;
        // console.log("file: "+this.original_path+": "+"█".repeat(percentage)+".".repeat(100-percentage));

        await this.changeULStatus((chunks_uploading > 0) ? File.UPLOADING_STATUS_UPLOADING : File.UPLOADING_STATUS_UPLOADED);
    }

    async reconsiderDownloadingStatus(cascade) {  // todo: cascade is not used?
        // todo: wrap everything in a transaction/locking later
        const chunkinfo_chunk = await Chunk.findOrCreate(this.id); // todo: use with locking
        // At this point we know for sure that the chunk with this id exists

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

        if (! this.chunkIds || this.chunkIds.length === 0) {
            let chunkInfoBuf = chunkinfo_chunk.getData();
            let supposedPrologSlice = chunkInfoBuf.slice(0, this.CHUNKINFO_PROLOGUE.length + 1); // Note! Buffer.slice is not (start, length), it's (start end), hence +1
            let prologAsBuffer = Buffer.from(this.CHUNKINFO_PROLOGUE);

            if (! supposedPrologSlice.equals(prologAsBuffer)) {
                // doesn't contain chunkinfo prologue at the beginning
                // whatever we've got in the chunkinfo chunk IS the whole file
                this.size = Buffer.byteLength(chunkInfoBuf);
                this.chunkIds = [ this.id ];
                await this.save();

                await this.dumpToDiskFromChunks();

                await this.changeDLStatus(File.DOWNLOADING_STATUS_DOWNLOADED);
                return;
            }

            // else set chunk info and continue
            this.setChunkInfo(chunkinfo_chunk.getData().toString('utf-8'));
            await this.save();
        }

        // ----------------------------------------------

        const chunk_ids = _.uniq( this.getAllChunkIds() );

        let needs_downloading = false;
        await Promise.all(chunk_ids.map(async(chunk_id, i) => {
            let chunk = await Chunk.findOrCreate(chunk_id);
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
                console.dir({_this:this}, {depth: 2});
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

    // todo: make into static, and do as few side-effects as possible
    async chunkify() {
        if (! this.chunkIds) {
            const CHUNK_SIZE_BYTES = this.ctx.config.storage.chunk_size_bytes;
            const size = this.getFileSize();
            const totalChunks = Math.ceil(size / CHUNK_SIZE_BYTES);

            if (totalChunks === 1) { // todo: don't forget that prologue increases the size, sometimes over the chunk_size_bytes boundary
                // Only one chunk. Don't chunkify it or try to create chunkinfo chunk

                let contents = fs.readFileSync(this.original_path, {encoding: null}); // buffer
                let contents_id = Chunk.forceSaveToDisk(contents);
                this.chunkIds = [ contents_id ];
                this.id = contents_id;

                // todo: this block of code repeats, compress
                const alreadyExistingFile = await File.findByPk(this.id); // todo: use findOrCreate with locking
                if (alreadyExistingFile) {
                    // A file with this id already exists! This changes everything
                    // TODO: figure out how to merge redundancy, expires, autorenew etc.
                    if (alreadyExistingFile.ul_status !== File.UPLOADING_STATUS_UPLOADING &&
                        alreadyExistingFile.ul_status !== File.UPLOADING_STATUS_UPLOADED)
                    {
                        alreadyExistingFile.chunkIds = [ contents_id ]; // todo: this is a hack, because it was null for some reason here, but check if this is not dangerous
                        alreadyExistingFile.size = Buffer.byteLength(contents); // todo: this is a hack, because it was null for some reason here, but check if this is not dangerous
                        await alreadyExistingFile.save();
                        alreadyExistingFile.ul_status = File.UPLOADING_STATUS_UPLOADING;
                        await alreadyExistingFile.changeULStatusOnAllChunks(Chunk.UPLOADING_STATUS_UPLOADING);
                        await alreadyExistingFile.save();
                    }
                } else {
                    await this.save();
                }

                let chunk = await Chunk.findOrCreate(contents_id);
                chunk.size = Buffer.byteLength(contents);
                chunk.dl_status = Chunk.DOWNLOADING_STATUS_CREATED;
                chunk.ul_status = Chunk.UPLOADING_STATUS_UPLOADING;
                chunk.redundancy = this.redundancy;
                chunk.expires = this.expires;
                chunk.autorenew = this.autorenew;
                await chunk.save();
                await chunk.addBelongsToFile(this, -1);

                console.log({chunk});

                return this.chunkIds;
            }

            // else: more than 1 chunk
            
            return new Promise((resolve, reject) => {
                try {
                    let chunkIds = [];
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
                                chunkIds.push(chunkId);
                                currentChunk = Buffer.alloc(CHUNK_SIZE_BYTES);
                                currentChunkLength = 0;
                            }

                            buf.copy(currentChunk, currentChunkLength, bufCopied, buf.length);
                            currentChunkLength += (buf.length-bufCopied);
                        })
                        .on('end', () => {
                            // ...And the final one
                            if (currentChunkLength !== 0) {
                                currentChunk = currentChunk.slice(0, currentChunkLength);
                                chunkId = Chunk.forceSaveToDisk(currentChunk);
                                chunkIds.push(chunkId);
                            }

                            if (chunkIds.length !== totalChunks) {
                                return reject('Something went wrong, totalChunks '+totalChunks+' didn\'t match chunks.length '+chunkIds.length);
                            }

                            this.chunkIds = chunkIds;

                            (async() => {
                                let merkleTree = await this.getMerkleTree();
                                let chunkInfoContents = this.CHUNKINFO_PROLOGUE + JSON.stringify({
                                    type: 'file',
                                    chunks: chunkIds,
                                    hash: 'keccak256',
                                    filesize: this.getFileSize(),
                                    merkle: merkleTree.map(x => x.toString('hex')),
                                });

                                let chunkInfoContentsBuffer = Buffer.from(chunkInfoContents, 'utf-8');  // todo: sure it's utf8? buffer uses utf8 by default anyway when casting. but what about utf16?
                                let chunkInfo = await Chunk.findOrCreateByData(chunkInfoContentsBuffer);
                                this.id = chunkInfo.id;
                                const alreadyExistingFile = await File.findByPk(this.id); // todo: use findOrCreate with locking
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

                                chunkInfo.size = Buffer.byteLength(chunkInfoContentsBuffer);
                                chunkInfo.dl_status = Chunk.DOWNLOADING_STATUS_CREATED;
                                chunkInfo.redundancy = this.redundancy;
                                chunkInfo.expires = this.expires;
                                chunkInfo.autorenew = this.autorenew;
                                chunkInfo.ul_status = Chunk.UPLOADING_STATUS_UPLOADING;
                                await chunkInfo.save();
                                await chunkInfo.addBelongsToFile(this, -1);

                                for (let i in chunkIds) {
                                    let chunkId = chunkIds[i];

                                    // no await needed, let them be free
                                    (async (i, chunkId) => {
                                        let chunk = await Chunk.findOrCreate(chunkId); // todo: use with locking
                                        let offset = i * CHUNK_SIZE_BYTES;
                                        chunk.ul_status = Chunk.UPLOADING_STATUS_UPLOADING;
                                        chunk.dl_status = Chunk.DOWNLOADING_STATUS_CREATED;
                                        chunk.size = chunk.getSize();
                                        chunk.redundancy = this.redundancy;
                                        chunk.expires = this.expires;
                                        chunk.autorenew = this.autorenew;
                                        await chunk.save();
                                        await chunk.addBelongsToFile(this, offset);
                                    })(i, chunkId).then(nothing => {
                                    });
                                }

                                resolve(this.chunkIds);
                            })();
                        })
                        .on('error', reject);
                } catch(e) {
                    reject(e);
                }
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

File.UPLOADING_STATUS_CREATED = 'us0';
File.UPLOADING_STATUS_UPLOADING = 'us1';
File.UPLOADING_STATUS_FAILED = 'us2';
File.UPLOADING_STATUS_UPLOADED = 'us99';
File.DOWNLOADING_STATUS_CREATED = 'ds0';
File.DOWNLOADING_STATUS_DOWNLOADING_CHUNKINFO = 'ds1';
File.DOWNLOADING_STATUS_DOWNLOADING = 'ds2';
File.DOWNLOADING_STATUS_DOWNLOADED = 'ds99';
File.DOWNLOADING_STATUS_FAILED = 'ds3';

File.init({
    id: { type: Sequelize.DataTypes.STRING, unique: true, primaryKey: true },
    original_path: { type: Sequelize.DataTypes.TEXT },
    size: { type: Sequelize.DataTypes.INTEGER, allowNull: true },  // allowNull:true because on downloading we don't yet know the file size before we have the chunkInfo chunk
    chunkIds: { type: Sequelize.DataTypes.JSON, allowNull: true },

    ul_status: { type: Sequelize.DataTypes.STRING, defaultValue: File.UPLOADING_STATUS_CREATED },
    dl_status: { type: Sequelize.DataTypes.STRING, defaultValue: File.DOWNLOADING_STATUS_CREATED },

    // allowNull in the next rows because this is only related to uploading and storing, not files queued for downloading
    redundancy: { type: Sequelize.DataTypes.INTEGER, allowNull: true },
    expires: { type: Sequelize.DataTypes.BIGINT, allowNull: true },
    autorenew: { type: Sequelize.DataTypes.BOOLEAN, allowNull: true },

}, {
    indexes: [
        { fields: ['ul_status'] },
        { fields: ['dl_status'] },
    ]
});

module.exports = File;
