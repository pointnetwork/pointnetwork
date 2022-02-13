const Model = require('./model');
const SequelizeFactory = require('./models/index');
const config = require('config');

class DB {
    constructor(ctx) {
        this.ctx = ctx;
        this.log = ctx.log.child({module: 'DB'});
        this.config = config.get('db');

        SequelizeFactory.init(this.ctx);
        this.connection = SequelizeFactory.sequelize;

        Model.ctx = ctx;
    }

    async init() {
        await this.connection.authenticate();
        this.log.debug('Connection with DB established successfully');

        Model.connection = this.connection;
    }

    async shutdown() {
        await this.connection.close();
    }
}

module.exports = DB;
