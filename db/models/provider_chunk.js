const Model = require('../model');
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

// todo: two files? maybe reuse some code at least

class ProviderChunk extends Model {
    constructor(...args) {
        super(...args);
    }

    static getChunkStoragePath(id) {
        const cache_dir = path.join(this.ctx.datadir, this.ctx.config.service_provider.storage.cache_path);
        this.ctx.utils.makeSurePathExists(cache_dir);
        return cache_dir + '/' + 'provider_chunk_' + id;
    }
    static getSegmentStoragePath(segment_hash, chunk_id) {
        const cache_dir = path.join(this.ctx.datadir, this.ctx.config.service_provider.storage.cache_path);
        this.ctx.utils.makeSurePathExists(cache_dir);
        return cache_dir + '/' + 'provider_chunk_segment_' + segment_hash;
    }
    static getDecryptedChunkStoragePath(id) {
        // todo: can there be a situation where when decrypted, the contents is the same as another decrypted chunk? maybe find a way to store them in one space?
        const cache_dir = path.join(this.ctx.datadir, this.ctx.config.service_provider.storage.cache_path);
        this.ctx.utils.makeSurePathExists(cache_dir);
        return cache_dir + '/' + 'provider_chunk_decrypted_' + id;
    }

    getData() {
        // todo: read from fs if you have it already or retrieve using storage layer client
        let chunk_path = ProviderChunk.getChunkStoragePath(this.id);
        if (fs.existsSync(chunk_path)) {
            return fs.readFileSync(chunk_path, { encoding: null });
        } else {
            // todo: would be correct to reassemble them when retrieving so that they're accessible by chunk_path

            if (!this.segment_hashes) throw new Error('?: segment hashes not found'); // todo

            console.log('segment_hashes', this.segment_hashes);

            let data = Buffer.alloc(0);
            for(let segment_hash of this.segment_hashes) {
                const segment_path = ProviderChunk.getSegmentStoragePath(segment_hash, this.id);
                let buffer = fs.readFileSync(segment_path, { encoding: null }); // todo: what if doesn't exist? then we have an error: Error: ENOENT: no such file or directory, open '/Users/username/.point/test1/data/provider_storage_cache/provider_chunk_segment_a9bf0cd755c9058...
                data = Buffer.concat([data, buffer]);
                const segment_real_hash = this.ctx.utils.hashFnHex(buffer);
                if (segment_hash !== segment_real_hash) throw new Error('EINVALIDHASH: Segment read from disk doesn\'t match its ID'); // todo: intercept?
            }
            // Note: Buffer.slice is (start,end) not (start,length)
            data = data.slice(0, this.length); // todo: theor.security issue: can there be several chunk with the same length/diff hash or same hash/diff length?

            fs.writeFileSync(chunk_path, data, { encoding: null });
            // todo: delete segments? cause we don't need them anymore
            // todo: check the hash of the chunk you reassembled, just in case?

            return data;
        }
    }

    async getDecryptedData() {
        const fileName = ProviderChunk.getDecryptedChunkStoragePath(this.id);
        if (fs.existsSync(fileName)) { // todo: what if file exists but has just been created and partially filled with decrypted data? (still being decrypted)
            return fs.readFileSync(fileName, { encoding: null }).slice(0, this.real_size);
        } else {
            throw new Error('Decrypted file for this chunk doesnt exist');
        }
    }

    hasDecryptedData() {
        // todo: what if file exists but has just been created and partially filled with decrypted data? (still being decrypted)
        let decryptedFileName = ProviderChunk.getDecryptedChunkStoragePath(this.id);
        return fs.existsSync(decryptedFileName);
    }

    // todo:
    // async setEncryptedData(data, length, pubKey) {
    //     const decrypted = await Redkey.decryptDataStatic(data, length, pubKey); // todo: what if errors out
    //
    //     console.log(decrypted);
    //
    //     const encrypted_hash = this.ctx.utils.hashFnHex(data);
    //     const decrypted_hash = this.ctx.utils.hashFnHex(decrypted);
    //
    //     // todo: something's wrong here. the same chunk with two different keys will be conflicting with itself
    //     if (decrypted_hash !== this.id) {
    //         throw new Error('Decrypted hash doesn\'t match the provided data');
    //     }
    //
    //     const chunk_file_path = ProviderChunk.getChunkStoragePath(this.id);
    //
    //     // todo: check length
    //
    //     // todo: what if already exists? should we overwrite again or just use it? without integrity check?
    //     fs.writeFileSync(chunk_file_path, data, { encoding: null });
    // }

    validateSegmentHashes() {
        const merkleTree = this.ctx.utils.merkle.merkle(this.segment_hashes.map(x=>Buffer.from(x, 'hex')), this.ctx.utils.hashFn);
        if (merkleTree[merkleTree.length-1].toString('hex') !== this.id) {
            throw Error('EINVALIDHASH: Provider Chunk ID and merkle root don\'t match: '+this.id+' vs '+merkleTree[merkleTree.length-1].toString('hex'));
        }
    }

    setSegmentData(rawData, segment_index) {
        const SEGMENT_SIZE_BYTES = this.ctx.config.storage.segment_size_bytes; // todo: ?

        // todo: verify only using proof

        let segment_hash;
        try {
            segment_hash = this.segment_hashes[segment_index].toString('hex'); // todo: validate that data is Buffer
        } catch(e) {
            console.warn(e);
            console.log(this.toJSON());
            throw e; // todo: process
        }
        if (!Buffer.isBuffer(rawData)) throw Error('ProviderChunk.setSegmentData: data must be a Buffer!');
        const data_hash = this.ctx.utils.hashFnHex(rawData);
        if (data_hash !== segment_hash) {
            throw Error('EINVALIDHASH: segment hash and data hash don\'t match: '+segment_hash+' vs '+data_hash);
        }

        const segment_path = ProviderChunk.getSegmentStoragePath(segment_hash, this.id);

        // todo: what if already exists? should we overwrite again or just use it? without integrity check?
        fs.writeFileSync(segment_path, rawData, { encoding: null });
    }

    // todo: remove or reenable because setSegmentData replaced this functionality
    // setData(rawData) {
    //     // todo: future: dont zero out the rest of the chunk if it's the last one, save space
    //     // todo: check data length? well, hash should be taking care of it already
    //
    //     if (!Buffer.isBuffer(rawData)) throw Error('ProviderChunk.setData: rawData must be a Buffer!');
    //
    //     const data_hash = this.ctx.utils.hashFnHex(rawData);
    //
    //     if (this.id !== data_hash) {
    //         throw Error('EINVALIDHASH: Provider Chunk ID and data hash don\'t match: '+this.id+' vs '+data_hash);
    //     }
    //
    //     const chunk_file_path = ProviderChunk.getChunkStoragePath(this.id);
    //
    //     // todo: what if already exists? should we overwrite again or just use it? without integrity check?
    //     fs.writeFileSync(chunk_file_path, rawData, { encoding: null });
    // }

}

ProviderChunk.init({
    id: { type: Sequelize.DataTypes.STRING, unique: true, primaryKey: true },
    size: { type: Sequelize.DataTypes.INTEGER },

    real_id: { type: Sequelize.DataTypes.STRING },
    real_id_verified: { type: Sequelize.DataTypes.BOOLEAN },
    real_size: { type: Sequelize.DataTypes.INTEGER },

    status: { type: Sequelize.DataTypes.STRING },

    public_key: { type: Sequelize.DataTypes.TEXT },

    segment_hashes: { type: Sequelize.DataTypes.JSON, allowNull: true },

    // TODO
    // redundancy: { type: Sequelize.DataTypes.INTEGER },
    // expires: { type: Sequelize.DataTypes.BIGINT },
    // autorenew: { type: Sequelize.DataTypes.BOOLEAN },

}, {
    indexes: [
        { fields: ['status'] },
        { fields: ['real_id'] },
    ]
});

ProviderChunk.STATUS_CREATED = 's0';
ProviderChunk.STATUS_DOWNLOADING = 's1';
ProviderChunk.STATUS_STORED = 's2';

ProviderChunk.STATUSES = {
    CREATED: ProviderChunk.STATUS_CREATED,
    DOWNLOADING: ProviderChunk.STATUS_DOWNLOADING,
    STORED: ProviderChunk.STATUS_STORED,
};

module.exports = ProviderChunk;