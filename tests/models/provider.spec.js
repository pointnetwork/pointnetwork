const fs = require('fs');
const os = require("os");
const _ = require('lodash')
const defaultConfig = require('../../resources/defaultConfig.json');

const ctx = {};
const datadir = process.env.DATADIR ? process.env.DATADIR : `~/.point/test2/`.replace("~", os.homedir);
const nodeConfigPath = `${datadir}/config.json`;
ctx.datadir = ctx.datapath = datadir;

const config = JSON.parse(fs.readFileSync(nodeConfigPath, 'utf-8'));
ctx.configPath = nodeConfigPath;
ctx.basepath = __dirname;
ctx.config = _.merge(defaultConfig, config);

ctx.config.db.dialect = 'postgres'
ctx.config.db.database = 'point_test'
ctx.config.db.username = 'pointuser'
ctx.config.db.password = 'pointpassword'
ctx.config.db.host = 'database'

ctx.log = { debug: jest.fn() }

let Provider;

describe('Provider model', () => {
    const DB = require('../../db');
    const db = new DB(ctx);

    afterEach(async () => {
        // delete records
    });

    afterAll(async () => {
        // delete records
    });

    describe('create', () => {
        let provider;

        beforeAll(async () => {
            await db.init();
            Provider = require('../../db/models/provider');
            Provider.destroy({
                where: {},
                force: true
            })

            let providerId = 1
            let providerAddress = '0xB87C8Ec8cd1C33EB9548490D64623a63Fd757415'

            provider = await Provider.create({
                id: providerId,
                address: providerAddress,
                connection: `http://localhost:12345/#${providerAddress}`
            });
        });

        it.only('creates a record in `providers` table', async () => {
            const providers = await Provider.findAll()

            expect(providers).toBeInstanceOf(Array);
            expect(providers).toHaveLength(1);

            const [savedProvider] = providers;

            expect(savedProvider).toHaveProperty('id', provider.id);
            expect(savedProvider).toHaveProperty('address', provider.address);
            expect(savedProvider).toHaveProperty('connection', provider.connection);
        });
    });

    xdescribe('update', () => {
        let provider;

        beforeAll(async () => {
            provider = Provider.new();
            provider.address = '0x58ac48d9a9d91742d1E12afFcf3A1f8b3E31A73D';
            provider.connection = 'http://localhost:54321/#' + provider.address;

            await provider.save();
        });

        it('updates a record in `providers` table', async () => {
            const updatedConnection = provider.connection.replace('localhost', '127.0.0.1');

            provider.connection = updatedConnection;
            await provider.save();

            const savedProviders = await knex.select().from('providers').where('id', provider._id);

            expect(savedProviders).toBeInstanceOf(Array);
            expect(savedProviders).toHaveLength(1);
            expect(savedProviders[0]).toHaveProperty('connection', updatedConnection);
        });
    });

    xdescribe('find or create and save', () => {
        const address = '0xc01011611e3501c6b3f6dc4b6d3fe644d21ab301';
        const connection = 'http://storage_provider:9685/#c01011611e3501c6b3f6dc4b6d3fe644d21ab301';

        beforeAll(() => Provider.findOrCreateAndSave(connection));

        it('extracts address and connection string from a string id and saves correct provider fields', async () => {
            const savedProviders = await knex.select().from('providers');

            expect(savedProviders).toBeInstanceOf(Array);
            expect(savedProviders).toHaveLength(1);

            const [savedProvider] = savedProviders;

            expect(savedProvider).toHaveProperty('id', expect.any(Number));
            expect(savedProvider).toHaveProperty('connection', connection);
            expect(savedProvider).toHaveProperty('address', address);
        });
    });
});
