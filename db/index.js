const Model = require('./model');
const config = require('config');

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
}

module.exports = DB;
