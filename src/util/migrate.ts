import {Sequelize} from 'sequelize';
import {Umzug, SequelizeStorage, MigrationError} from 'umzug';
import path from 'path';
import logger from '../core/log';
import {SequelizeFactory} from '../db/models';

const log = logger.child({module: 'migrate'});

export default (async () => {
    const sequelize = SequelizeFactory.init();

    const migrations = path.resolve(__dirname, '..', '..', 'migrations', 'database', '*.js');
    const umzug = new Umzug({
        migrations: {
            glob: migrations,
            resolve({name, path: migrationPath, context}) {
                // Adjust the migration from the new signature to the v2 signature, making easier to upgrade to v3
                const migration = require(migrationPath as string);
                return {
                    name,
                    up: async () => migration.up(context, Sequelize),
                    down: async () => migration.down(context, Sequelize)
                };
            }
        },
        context: sequelize.getQueryInterface(),
        storage: new SequelizeStorage({sequelize}),
        logger: log
    });

    try {
        await umzug.up();
    } catch (e) {
        log.error(e);
        if (e instanceof MigrationError) {
            await umzug.down();
        } else {
            throw e;
        }
    }
});
