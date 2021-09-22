const Model = require('./model');
const SequelizeFactory = require('./models/index');
const path = require('path');
const fs = require('fs');

class DB {
    constructor(ctx) {
        this.ctx = ctx;
        this.config = ctx.config.db;

        SequelizeFactory.init(this.ctx);
        this.connection = SequelizeFactory.sequelize;

        Model.ctx = ctx;
    }

    async init() {
        await this.connection.authenticate();
        this.ctx.log.debug('Connection with DB established successfully');

        Model.connection = this.connection;
    }

    async shutdown() {
        await this.connection.close();
    }

    static async __debugClearCompletely(ctx) {
        // todo: remove

        // Clear storage data files
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

        // Clear postgres db
        await ctx.db.init();
        let sql = "DROP OWNED BY "+ctx.config.db.username+" CASCADE"; // todo: sqli, sanitize
        console.log("Executing Drop SQL: "+sql);
        console.log(await Model.connection.query(sql, { raw: true }));

        ctx.log.info('__debugClearCompletely executed.');
        ctx.die();
    }
}

module.exports = DB;