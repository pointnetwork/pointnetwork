const knex = require('../../db/knex');
const DB = require('../../db');
const Model = require('../../db/model');
const RedKey = require('../../db/models/redkey');
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

    describe('generate one for provider', () => {
        let provider;
        let redkey;
        const index = 1;

        beforeAll(async () => {
            const connection = 'http://storage_provider:9685/#c01011611e3501c6b3f6dc4b6d3fe644d21ab301';
            const providerInstance = await Provider.findOrCreateAndSave(connection);

            [provider] = await knex('providers').select().where({connection});
            redkey = await RedKey.generateNewForProvider(providerInstance, index);
        });

        it('creates redkey and sets correct provider id', async () => {
            const savedRedKeys = await knex('redkeys').select();

            expect(savedRedKeys).toBeInstanceOf(Array);
            expect(savedRedKeys).toHaveLength(1);

            const [savedRedKey] = savedRedKeys;

            expect(savedRedKey).toHaveProperty('public_key', redkey.pub);
            expect(savedRedKey).toHaveProperty('private_key', redkey.priv);
            expect(savedRedKey).toHaveProperty('key_index', index);
            expect(savedRedKey).toHaveProperty('provider_id', provider.id);
        });
    });
});
