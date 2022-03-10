'use strict';

import path from 'path';
import {Sequelize} from 'sequelize';
import config from 'config';
import logger from '../../core/log';
import {resolveHome} from '../../core/utils';

const log = logger.child({module: 'Sequelize'});

export class SequelizeFactory {

    static sequelize: Sequelize;

    static init() {
        if (!SequelizeFactory.sequelize) {
            const dbConfig = config.get('db') as DatabaseConfig;
            const storage = path.join(resolveHome(config.get('datadir')), dbConfig.storage);
            SequelizeFactory.sequelize = new Sequelize(
                dbConfig.database,
                dbConfig.username,
                dbConfig.password,
                {
                    dialect: dbConfig.dialect,
                    define: dbConfig.define,
                    storage,
                    transactionType: dbConfig.transactionType,
                    retry: {max: dbConfig.retry.max},
                    logQueryParameters: true,
                    logging: config.get('db.enable_db_logging') ? log.debug.bind(log) : false
                }
            );

        }
        return SequelizeFactory.sequelize;
    }
}
