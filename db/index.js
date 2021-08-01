const level = require('level');
const sublevel = require('sublevel');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const utils = require('../core/utils');

class DB {
    constructor(ctx) {
        this.ctx = ctx;
        this.config = ctx.config.db;

        this.tableNames = ['chunk', 'storage_link', 'file', 'provider_chunk', 'redkey', 'provider', 'subscription'];
    }

    async init() {
        this.dbpath = path.join(this.ctx.datadir, this.config.path);
        if (! fs.existsSync(this.dbpath)) {
            mkdirp.sync(this.dbpath);
        }

        const options = {
            createIfMissing: true,
            valueEncoding: 'json'
        };
        this._db = sublevel(level(this.dbpath, options, (err, db) => {
            if (err) this.ctx.die(err);
        }));

        await this._loadTables();
    }

    async _loadTables() {
        for (let tableName of this.tableNames) {
            this[tableName] = require('./models/'+tableName);
            this[tableName].ctx = this.ctx;
            this[tableName].tableName = tableName;
            this[tableName].db = this._db.sublevel(tableName);
            this[tableName]._indices = [];
            this[tableName]._indexReducers = {};
            this[tableName]._buildIndices();
        }
    }

    async get(...args) {
        return await this._db.get(...args);
    }
    async put(...args) {
        return await this._db.put(...args);
    }

    async shutdown() {
        await this._db.parent.close();
    }

    static generateRandomIdForNewRecord() {
        // todo: leave as is or improve?
        let seed = Date.now() + Math.random().toString().replace('.', '').toString(64);
        return 'rnd'+utils.sha256hex(seed);
    }

    async __debugDumpEverything() {
        // todo: remove
        return new Promise((resolve, reject) => {
            let keys = [];
            console.log('Dumping DB...');
            this._db.db.createReadStream({})
                .on('data', (data) => {
                    console.log(
                        data.key,
                        Buffer.from(data.key).toString('hex'),
                        '=', data.value
                    )
                })
                .on('error', reject)
                .on('end', async () => {
                    console.log('Dumping ended');
                    resolve();
                });
        });
    }
    static __debugClearCompletely(ctx) {
        // todo: remove

        // await this.shutdown();
        let dbpath = ctx.config.db.path;
        if (typeof dbpath !== 'string' || dbpath.length < 5) {
            console.warn('ABORT! Trying to delete files from '+dbpath+'/**/*');
            ctx.die('ABORT! Trying to delete files from '+dbpath+'/**/*');
            return;
        }
        dbpath = path.join(ctx.datadir, dbpath);
        if (typeof dbpath !== 'string' || dbpath.length < 5) {
            console.warn('ABORT! Trying to delete files from '+dbpath+'/**/*');
            ctx.die('ABORT! Trying to delete files from '+dbpath+'/**/*');
            return;
        }
        let files = fs.readdirSync(dbpath);
        for (const file of files) {
            fs.unlinkSync(path.join(dbpath, file));
        }

        let dirs = [ctx.config.client.storage.cache_path, ctx.config.service_provider.storage.cache_path, ctx.config.client.zproxy.cache_path];
        for(let dir of dirs) {
            if (typeof dir !== 'string' || dir.length < 5) {
                console.warn('ABORT! Trying to delete files from '+dir+'/**/*');
                ctx.die('ABORT! Trying to delete files from '+dir+'/**/*');
                return;
            }

            let cache_dir = path.join(ctx.datadir, dir);

            if (fs.existsSync(cache_dir)) {
                let files = fs.readdirSync(cache_dir);
                for (const file of files) {
                    // console.log('Removing '+path.join(cache_dir, file));
                    fs.unlinkSync(path.join(cache_dir, file));
                }
            }
        }

        ctx.log.info('__debugClearCompletely executed.');
    }

    async __debugDeleteTable(tableName) {
        // todo: remove
        console.warn('Deleting table '+tableName);

        let keys = await this.ctx.db[tableName].allKeys();
        for(let key of keys) {
            await new Promise((resolve, reject) => {
                this.ctx.db[tableName].db.del(key, (err) => {
                    if (err) reject(err);
                    resolve();
                });
            });
        }

        console.log('Results: '+(await this.ctx.db[tableName].allKeys()).length+' keys remain');
    }

    batchSerialize(collection) {
        let result = [];
        for (let item of collection) {
            result.push(item.toJSON());
        }
        return result;
    }
}

module.exports = DB;
