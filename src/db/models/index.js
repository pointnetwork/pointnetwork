'use strict';
const path = require('path');
const Sequelize = require('sequelize');
const config = require('config');
const logger = require('../../core/log');
const log = logger.child({module: 'Sequelize'});
const {resolveHome} = require('../../core/utils');

class SequelizeFactory {
    init(ctx) {
        this.ctx = ctx;
        this.config = config.get('db');
        const storage = path.join(resolveHome(config.get('datadir')), this.config.storage);
        this.Sequelize = Sequelize; // Needed for export!
        this.sequelize = new Sequelize(
            this.config.database,
            this.config.username,
            this.config.password,
            {
                dialect: this.config.dialect,
                define: this.config.define,
                storage,
                transactionType: this.config.transactionType,
                retry: {max: this.config.retry.max},
                logQueryParameters: true,
                logging: log.debug.bind(log),
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
