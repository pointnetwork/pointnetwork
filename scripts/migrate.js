const path = require('path');
const {Sequelize} = require('sequelize');
const {Umzug, SequelizeStorage, MigrationError} = require('umzug');
const {production: config} = require(path.resolve(process.cwd(), 'resources', 'sequelizeConfig.json'));

const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    define: config.define,
    logQueryParameters: true,
    logging: false,
});

const umzug = new Umzug({
    migrations: {
        glob: 'db/migrations/*.js',
        resolve({name, path, context}) {
            // Adjust the migration from the new signature to the v2 signature, making easier to upgrade to v3
            const migration = require(path);
            return {
                name,
                up: async () => migration.up(context),
                down: async () => migration.down(context),
            };
        },
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({sequelize}),
    logger: console,
});

module.exports = async () => {
    try {
        await umzug.up();
        await sequelize.close();
    } catch (e) {
        await umzug.down();
        if (e instanceof MigrationError) {
            console.error('Migration error:', e.cause());
        } else {
            throw e;
        }
    }
};
