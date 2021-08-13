const knex = require('../../db/knex');
const DB = require('../../db');
const Model = require('../../db/model');
const RedKey = require('../../db/models/redkey');
const Provider = require('../../db/models/provider');

Model.prototype.save = jest.fn();
Model.prototype.db = {
    batch: jest.fn(() => ({
        put: jest.fn(function() {
            return this;
        }),
        write: jest.fn(function() {
            return this;
        })
    }))
};

const generateProvider = async () => {
    const provider = Provider.new();
    provider.address = '0xB87C8Ec8cd1C33EB9548490D64623a63Fd757415';
    provider.connection = 'http://localhost:12345/#' + provider.address;

    await provider.save();
    return provider;
};

describe('RedKey model', () => {
    afterEach(async () => {
        await knex('redkeys').delete();
        await knex('providers').delete();
    });

    afterAll(async () => {
        await knex.destroy();
    });

    describe('create', () => {
        let redKey;
        let provider;

        beforeAll(async () => {
            provider = await generateProvider();

            redKey = RedKey.new();
            redKey.id = DB.generateRandomIdForNewRecord();
            redKey.provider_id = provider._id;
            redKey.private_key = 'foo';
            redKey.public_key = 'bar';
            redKey.key_index = 42;

            await redKey.save();
        });

        it('creates a record in `redkeys` table', async () => {
            const redKeys = await knex('redkeys').select();

            expect(redKeys).toBeInstanceOf(Array);
            expect(redKeys).toHaveLength(1);

            const [savedRedKey] = redKeys;

            expect(savedRedKey).toHaveProperty('id', redKey._id);
            expect(savedRedKey).toHaveProperty('provider_id', provider._id);
            expect(savedRedKey).toHaveProperty('private_key', redKey.private_key);
            expect(savedRedKey).toHaveProperty('public_key', redKey.public_key);
            expect(savedRedKey).toHaveProperty('key_index', redKey.key_index);
        });
    });

    describe('update', () => {
        let redKey;
        let provider;

        beforeAll(async () => {
            provider = await generateProvider();

            redKey = RedKey.new();

            redKey.id = DB.generateRandomIdForNewRecord();
            redKey.provider_id = provider._id;
            redKey.private_key = 'foo';
            redKey.public_key = 'bar';
            redKey.key_index = 42;

            await redKey.save();
        });

        it('updates a record in `redkeys` table', async () => {
            const updatedKeyIndex = 1337;

            redKey.key_index = updatedKeyIndex;
            await redKey.save();

            const savedRedKeys = await knex.select().from('redkeys').where('id', redKey._id);

            expect(savedRedKeys).toBeInstanceOf(Array);
            expect(savedRedKeys).toHaveLength(1);
            expect(savedRedKeys[0]).toHaveProperty('key_index', updatedKeyIndex);
        });
    });
});
