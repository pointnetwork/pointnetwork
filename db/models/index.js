'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
// const env = process.env.NODE_ENV || 'development'; // todo
// const config = require(__dirname + '/../config/config.json')[env];

class SequelizeFactory {
    ctx = null;
    Sequelize = Sequelize; // Needed for export!
    init = (ctx) => {
        this.ctx = ctx;
        this.config = this.ctx.config.db;
        this.log = this.ctx.log.child({module: 'SequelizeFactory'});

        this.sequelize = new Sequelize(this.config.database, this.config.username, this.config.password, {
            dialect: this.config.dialect,
            define: this.config.define,
            storage: this.config.storage,
            transactionType: this.config.transactionType,
            retry: {
                max: this.config.retry.max
            },
            logQueryParameters: true,
            logging: this.log.debug.bind(this.log),
        }); // todo: validate config

        // Pass context to base Model
        const Model = require('../model');
        Model.connection = this.sequelize;

        // Load models
        fs
            .readdirSync(__dirname)
            .filter(file => {
                return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
            })
            .forEach(file => {
                const modelClass = require(path.join(__dirname, file));
                if (!modelClass.__ignoreThisModelForNow) {
                    return new modelClass(this.ctx); // will load this into sequelize.models
                }
            });

        // todo: remove, right? why is it here?
        // Object.keys(this.sequelize.models).forEach(modelName => {
        //     if (this.sequelize.models[modelName].associate) {
        //         this.sequelize.models[modelName].associate(this.sequelize.models);
        //     }
        // });
    }
}

module.exports = new SequelizeFactory();
