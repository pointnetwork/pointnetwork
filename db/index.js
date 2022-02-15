const Model = require('./model');
const path = require('path');
const fs = require('fs');

class DB {
    constructor(ctx) {
        this.ctx = ctx;
        this.log = ctx.log.child({module: 'DB'});
        this.config = config.get('db');
        Model.setCtx(ctx);
    }

    async init() {
        // this function doesn't connect to the db, just make a check of the health of the connection
        // connection to the db for sqlite happens under the hood when a query is first created
        await this.connection.authenticate();
        this.log.debug('Connection with DB established successfully');
    }

    async shutdown() {
        await this.connection.close();
    }

    static async __debugClearCompletely(ctx) {
        // todo: remove

        // Clear storage data files
        const dirs = [
            path.join(config.get('datadir'), config.get('deployer.cache_path')),
            path.join(config.get('datadir'), config.get('storage.cache_path'))
        ];
        for (const dir of dirs) {
            if (typeof dir !== 'string' || dir.length < 5) {
                this.log.error('Trying to delete files from ' + dir + '/**/*');
                throw new Error('Trying to delete files from ' + dir + '/**/*');
            }

            const cache_dir = path.join(ctx.datadir, dir);

            if (fs.existsSync(cache_dir)) {
                const files = fs.readdirSync(cache_dir);
                for (const file of files) {
                    fs.unlinkSync(path.join(cache_dir, file));
                }
            }
        }

        // Clear postgres db
        await ctx.db.init();
        const sql = 'DROP OWNED BY ' + ctx.config.db.username + ' CASCADE'; // todo: sqli, sanitize
        this.log.debug({sql}, 'Executing Drop SQL');
        this.log.debug(
            {sql, result: await Model.connection.query(sql, {raw: true})},
            '__debugClearCompletely executed.'
        );

        ctx.die();
    }
}

module.exports = DB;
