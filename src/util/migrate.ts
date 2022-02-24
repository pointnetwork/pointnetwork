import {Sequelize} from 'sequelize';
import {Umzug, SequelizeStorage, MigrationError} from 'umzug';
import config from 'config';
import path from 'path';
import {resolveHome} from '../core/utils';
import logger from '../core/log';

export default (async () => {
    const dbConfig: DatabaseConfig = config.get('db');
    const storage = path.join(resolveHome(config.get('datadir')), dbConfig.storage);
    const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: dbConfig.dialect,
        define: dbConfig.define,
        storage,
        logQueryParameters: true,
        logging: false
    });

    const umzug = new Umzug({
        migrations: {
            glob: 'migrations/database/*.js',
            resolve({name, path: migrationPath, context}) {
                // Adjust the migration from the new signature to the v2 signature, making easier to upgrade to v3
                const migration = require(migrationPath as string);
                return {
                    name,
                    up: async () => migration.up(context),
                    down: async () => migration.down(context)
                };
            }
        },
        context: sequelize.getQueryInterface(),
        storage: new SequelizeStorage({sequelize}),
        logger: logger.child({module: 'migrate'})
    });

    try {
        await umzug.up();
        await sequelize.close();
    } catch (e) {
        if (e instanceof MigrationError) {
            await umzug.down();
        } else {
            throw e;
        }
    }
});
