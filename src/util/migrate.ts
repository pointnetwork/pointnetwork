import {Sequelize, QueryInterface} from 'sequelize';
import {Umzug, SequelizeStorage, MigrationError} from 'umzug';
import path from 'path';
import logger from '../core/log.js';
import {Database} from '../db/index.js';

const log = logger.child({module: 'migrate'});

const migrate = async () => {
    log.info('Starting database migration');

    const sequelize = Database.init();
    const migrationsGlob = path.join(__dirname, '../../migrations/database/*.js');
    const resolvedMigrationsGlob = path.resolve(migrationsGlob);

    // List files and debug log them
    const glob = require('glob');
    const files = glob.sync(resolvedMigrationsGlob);
    log.info({files}, 'Migrations files');

    const context = sequelize.getQueryInterface();

    const umzug = new Umzug({
        migrations: files.map((file: string) => ({
            name: path.basename(file),
            path: file,
            up: async ({context} : {context: QueryInterface}) => {
                log.info({name: path.basename(file), file}, 'Migrating');
                const migration = require(file);
                return migration.up(context, Sequelize);
            },
            down: async ({context} : {context: QueryInterface}) => {
                const migration = require(file);
                return migration.down(context, Sequelize);
            }
        })),
        // migrations: {
        //     glob: resolvedMigrationsGlob,
        //     resolve({name, path: migrationPath, context}) {
        //         log.info({name, migrationPath}, 'Migrating');
        //
        //         // Adjust the migration from the new signature to the v2 signature, making easier to upgrade to v3
        //         const migration = require(migrationPath as string);
        //
        //         const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
        //         const migration = new Function('require', 'module', 'exports', migrationContent)(require, {}, {});
        //
        //         return {
        //             name,
        //             up: async () => migration.up(context, Sequelize),
        //             down: async () => migration.down(context, Sequelize)
        //         };
        //     }
        // },
        context: context,
        storage: new SequelizeStorage({sequelize}),
        logger: log
    });

    log.info({migrationsGlob}, 'Migrations glob');

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

    log.info('Database migration finished');
};

export default migrate;
