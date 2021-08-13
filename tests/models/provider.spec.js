const knex = require('../../db/knex');
const DB = require('../../db');
const Model = require('../../db/model');
const Provider = require('../../db/models/provider');

Model.prototype.save = jest.fn();
Model.db = {
    get: jest.fn(() => {
        const error = new Error('Not found');
        error.notFound = true;
        throw error;
    })
};

Model.prototype.db = {
    get: jest.fn(() => {
        const error = new Error('Not found');
        error.notFound = true;
        throw error;
    }),
    batch: jest.fn(() => ({
        put: jest.fn(function() {
            return this;
        }),
        write: jest.fn(function() {
            return this;
        })
    }))
};

describe('Provider model', () => {
    afterEach(async () => {
        await knex('providers').delete();
    });

    afterAll(async () => {
        await knex.destroy();
    });

    describe('create', () => {
        let provider;

        beforeAll(async () => {
            provider = Provider.new();
            provider.address = '0xB87C8Ec8cd1C33EB9548490D64623a63Fd757415';
            provider.connection = 'http://localhost:12345/#' + provider.address;

            await provider.save();
        });

        it('creates a record in `providers` table', async () => {
            const providers = await knex('providers').select();

            expect(providers).toBeInstanceOf(Array);
            expect(providers).toHaveLength(1);

            const [savedProvider] = providers;

            expect(savedProvider).toHaveProperty('id', provider._id);
            expect(savedProvider).toHaveProperty('address', provider.address);
            expect(savedProvider).toHaveProperty('connection', provider.connection);
        });
    });

    describe('update', () => {
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

    describe('find or create and save', () => {
        const address = '0xc01011611e3501c6b3f6dc4b6d3fe644d21ab301';
        const connection = 'http://storage_provider:9685/#c01011611e3501c6b3f6dc4b6d3fe644d21ab301';

        beforeAll(() => Provider.findOrCreateAndSave(connection));
        // { 
        //     id: 'redkeyhttp---storage_provider-9685--c01011611e3501c6b3f6dc4b6d3fe644d21ab301_0' 
        //     pub: '-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb,,,,\n-----END PUBLIC KEY-----\n',
        //     priv: '-----BEGIN PRIVATE KEY-----\nMIICdQIBADA.....-----END PRIVATE KEY-----\n',
        //     provider_id: 'http://storage_provider:9685/#c01011611e3501c6b3f6dc4b6d3fe644d21ab301',
        //     index: 0,
        // }

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
