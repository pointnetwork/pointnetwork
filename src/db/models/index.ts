'use strict';

import path from 'path';
import {Sequelize} from 'sequelize';
import config from 'config';
import logger from '../../core/log';
import {resolveHome} from '../../core/utils';

const log = logger.child({module: 'Sequelize'});

interface SequelizeFactory {
    config: DatabaseConfig;
    Sequelize: typeof Sequelize;
    sequelize: Sequelize;
}

class SequelizeFactory implements SequelizeFactory {
    init() {
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
                logging: config.get('db.enable_db_logging') ? log.debug.bind(log) : false
            }
        );

        return this.sequelize;
    }
}

module.exports = new SequelizeFactory();
