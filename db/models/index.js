'use strict';

const Sequelize = require('sequelize');
// const env = process.env.NODE_ENV || 'development'; // todo
// const config = require(__dirname + '/../config/config.json')[env];

class SequelizeFactory {
    init(ctx) {
        this.ctx = ctx;
        this.config = this.ctx.config.db;
        this.log = this.ctx.log.child({module: 'Sequelize'});

        this.Sequelize = Sequelize; // Needed for export!
        this.sequelize = new Sequelize(
            this.config.database,
            this.config.username,
            this.config.password,
            {
                dialect: this.config.dialect,
                define: this.config.define,
                storage: this.config.storage,
                transactionType: this.config.transactionType,
                retry: {max: this.config.retry.max},
                logQueryParameters: true,
                logging: this.log.debug.bind(this.log),
                ctx
            }
        ); // todo: validate config

        return this.sequelize;

        // todo: remove, right? why is it here?
        // Object.keys(this.sequelize.models).forEach(modelName => {
        //     if (this.sequelize.models[modelName].associate) {
        //         this.sequelize.models[modelName].associate(this.sequelize.models);
        //     }
        // });
    }
}

module.exports = new SequelizeFactory();
