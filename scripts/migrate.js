const {Sequelize} = require('sequelize');
const {Umzug, SequelizeStorage, MigrationError} = require('umzug');
const config = require('config');
const dbConfig = config.get('db');
const path = require('path');

const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    define: dbConfig.define,
    storage: path.join(config.get('datadir'), dbConfig.storage),
    logQueryParameters: true,
    logging: false
});

const umzug = new Umzug({
    migrations: {
        glob: 'db/migrations/*.js',
        resolve({name, path: migrationPath, context}) {
            // Adjust the migration from the new signature to the v2 signature, making easier to upgrade to v3
            const migration = require(migrationPath);
            return {
                name,
                up: async () => migration.up(context),
                down: async () => migration.down(context)
            };
        }
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({sequelize}),
    logger: console
});

(async () => {
    try {
        await umzug.up();
        await sequelize.close();
    } catch (e) {
        if (e instanceof MigrationError) {
            console.error('Migration error:', e.cause());
        } else {
            throw e;
        }
    } finally {
        await umzug.down();
    }
})();
