const crypto = require('crypto');
const Model = require('../model');
const fs = require('fs');
const path = require('path');
const knex = require('../knex');
let StorageLink;
let File;

class Chunk extends Model {
    constructor(...args) {
        super(...args);

        // This is to avoid circular dependencies:
        File = require('./file');
        StorageLink = require('./storage_link');
    }

    static _buildIndices() {
        this._addIndex('ul_status');
        this._addIndex('dl_status');
    }

    /**
     * Fields:
     * - id which is chunk content's hash
     * ----
     * - known_providers
     */

    async save() {
        // save to postgres via knex
        let attrs = (({ id, redundancy, expires, autorenew, ul_status, dl_status }) => ({ leveldb_id: id, length: this.getLength(), redundancy, expires, autorenew, ul_status, dl_status, file_id: this.file_id}))(super.toJSON());

        const [chunk] = await knex('chunks')
            .insert(attrs)
            .onConflict("leveldb_id")
            .merge()
            .returning("*");

        super.save();
    }

    getData() {
        // todo: read from fs if you have it already or retrieve using storage layer client
        return fs.readFileSync(Chunk.getChunkStoragePath(this.id), { encoding: null });
    }

    setData(rawData) {
        let hash = this.ctx.utils.hashFnHex(rawData);

        if (this.id) {
            if (this.id !== hash) {
                // console.debug(rawData.toString());
                console.debug({rawDataHex: rawData.toString('hex'), rawData: rawData.toString(), hash, id: this.id}); // todo: remove at least .toString() parts for prod
                throw Error('Chunk ID and data hash don\'t match');
            }
        } else {
            this.id = hash;
        }

        this.dl_status = Chunk.DOWNLOADING_STATUS_DOWNLOADED;
        this.length = rawData.length;

        Chunk.forceSaveToDisk(rawData, this.id);
    }

    getLength() {
        if (typeof this.length !== 'undefined') {
            return this.length;
        } else {
            const filePath = Chunk.getChunkStoragePath(this.id);
            if (!fs.existsSync(filePath)) return undefined;
            return fs.statSync(filePath).size;
        }
    }

    static async findOrCreateByData(rawData) {
        let id = this.ctx.utils.hashFnHex(rawData);
        let result = await this.find(id);
        if (result === null) {
            result = this.new();
            this.id = id;
        }

        result.setData(rawData);

        return result;
    }

    isUploading() {
        return this.ul_status === Chunk.UPLOADING_STATUS_UPLOADING;
    }
    isDownloading() {
        return this.dl_status === Chunk.DOWNLOADING_STATUS_DOWNLOADING;
    }

    async reconsiderUploadingStatus(cascade = true) {
        let fn = async() => {
            const live_copies = await this.storage_links.signed;

            // 1. Redundancy
            if (live_copies.length < this.redundancy) {
                return await this.changeULStatus(Chunk.UPLOADING_STATUS_UPLOADING);
            }

            // 2. Expiry
            for(let l of live_copies) {
                if (l.expires < this.expires) { // todo: have some leeway in here, to avoid triggering reupload each time without it being necessary?
                    return await this.changeULStatus(Chunk.UPLOADING_STATUS_UPLOADING);
                }
            }

            // 3. Autorenew
            // todo, and not only here

            // Otherwise consider it live
            await this.changeULStatus(Chunk.UPLOADING_STATUS_UPLOADED);
        };
        let result = await fn();

        await this.refresh();

        if (cascade) {
            for(let f of await this.getFiles()) {
                await f.reconsiderUploadingStatus(false);
            }
        }

        return result;

        // todo: maybe immediately start uploading here? trigger the tick()? but be careful with recursion loops
    }

    async reconsiderDownloadingStatus(cascade = true) {
        // todo todo todo

        // Otherwise consider it live
        // await this.changeDLStatus(Chunk.DOWNLOADING_STATUS_DOWNLOADED);

        // todo: at least prefix it with IF chunk.dl_status === Chunk.DOWNLOADING_STATUS_DOWNLOADED then reconsider

        if (cascade) {
            for(let f of await this.getFiles()) {
                await f.reconsiderDownloadingStatus(false);
            }
        }

        // todo: immediately start downloading here? trigger the tick()?
    }

    async getFiles() {
        if (! ('belongsToFiles' in this._attributes)) return [];
        const file_ids = this.belongsToFiles.map(x => x[0]);
        let results = await Promise.all(file_ids.map(async(id) => await File.find(id)));
        return results;
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

    addBelongsToFile(file, offset) {
        // update the file_id fk using the file.pk
        this.file_id = file.pk;

        if (! ('belongsToFiles' in this._attributes)) {
            this._attributes.belongsToFiles = [];
        }

        // Remove duplicates
        for (let b of this._attributes.belongsToFiles) {
            if (b[0] === file.id && b[1] === offset) return;
        }

        this._attributes.belongsToFiles.push([ file.id, offset, file.originalPath ]);
    }

    getStorageLinks() {
        const target = {};
        return new Proxy(target, {
            get: async(x, status) => {
                const allStatuses = StorageLink.allStatuses();
                if (status === 'constructor') return target;
                if (! allStatuses.includes(status) && status !== 'all') return void 0;
                if (status === 'all') {
                    let results = await Promise.all(allStatuses.map(async(s) => await this.getStorageLinks()[s]));
                    return this.ctx.utils.iterableFlat(results);
                }
                return await StorageLink.byChunkIdAndStatus(this.id, status);
            },
            set: async(x, status, value) => {
                // todo
            }
        });
    }

    // todo: delete
    // async getStorageLinkIds(status = null) {
    //     if (! status) status = Chunk.STORAGE_LINK_STATUS_ALL;
    //     if (! this.storage_link_ids) return [];
    //     if (! this.storage_link_ids[status]) return [];
    //     if (status === Chunk.STORAGE_LINK_STATUS_ALL) {
    //         return (await Promise.all(Chunk.STORAGE_LINK_STATUSES.map(async(status) => await this.getStorageLinkIds(status)))).flat();
    //     }
    //     return this.storage_link_ids[status];
    // }

    static getChunkStoragePath(id) {
        const cache_dir = path.join(this.ctx.datadir, this.ctx.config.client.storage.cache_path);
        this.ctx.utils.makeSurePathExists(cache_dir);
        return path.join(cache_dir, 'chunk_' + id);
    }

    static forceSaveToDisk(data, id = null) {
        if (id === null) id = this.ctx.utils.hashFnHex(data);

        // todo: dont zero out the rest of the chunk if it's the last one, save space

        // todo: what if already exists? should we overwrite again or just use it? without integrity check?
        const chunk_file_path = Chunk.getChunkStoragePath(id);
        if (! fs.existsSync(chunk_file_path)) {
            fs.writeFileSync(chunk_file_path, data, { encoding: null });
        }

        return id;
    }

    getStatus() {
        throw Error('Dev message: Which status? ul_status or dl_status');
    }
}

Chunk.UPLOADING_STATUS_CREATED = 'us0';
Chunk.UPLOADING_STATUS_UPLOADING = 'us1';
Chunk.UPLOADING_STATUS_UPLOADED = 'us99';
Chunk.DOWNLOADING_STATUS_CREATED = 'ds0';
Chunk.DOWNLOADING_STATUS_DOWNLOADING = 'ds1';
Chunk.DOWNLOADING_STATUS_DOWNLOADED = 'ds99';
Chunk.DOWNLOADING_STATUS_FAILED = 'ds2';

module.exports = Chunk;
