const crypto = require('crypto');
const knex = require('../../db/knex');
const Model = require('../../db/model');
const ProviderChunk = require('../../db/models/provider_chunk');

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

const randomHash = () => (
    crypto.createHash('sha1').update(Date.now().toString() + Math.random().toString()).digest('hex')
);

describe('ProviderChunk model', () => {
    afterEach(async () => {
        await knex('provider_chunks').delete();
    });

    afterAll(async () => {
        await knex.destroy();
    });

    describe('create', () => {
        let providerChunk;

        beforeAll(async () => {
            providerChunk = ProviderChunk.new();

            providerChunk.id = randomHash();
            providerChunk.real_id = randomHash();
            providerChunk.pub_key = randomHash();
            providerChunk.segment_hashes = [randomHash(), randomHash(), randomHash()];
            providerChunk.real_id_verified = false;
            providerChunk.length = 256000;
            providerChunk.real_length = 512000;

            await providerChunk.save();
        });

        it('creates a record in `provider_chunks` table', async () => {
            const savedProviderChunks = await knex('provider_chunks').select();

            expect(savedProviderChunks).toBeInstanceOf(Array);
            expect(savedProviderChunks).toHaveLength(1);

            const [savedProviderChunk] = savedProviderChunks;

            expect(savedProviderChunk).toHaveProperty('id', providerChunk.id);
            expect(savedProviderChunk).toHaveProperty('real_id', providerChunk.real_id);
            expect(savedProviderChunk).toHaveProperty('public_key', providerChunk.pub_key);
            expect(savedProviderChunk).toHaveProperty('segment_hashes');
            expect(savedProviderChunk.segment_hashes).toEqual(expect.arrayContaining(providerChunk.segment_hashes));
            expect(savedProviderChunk).toHaveProperty('real_id_verified', providerChunk.real_id_verified);
            expect(savedProviderChunk).toHaveProperty('length', providerChunk.length);
            expect(savedProviderChunk).toHaveProperty('real_length', providerChunk.real_length);
        });
    });

    describe('update', () => {
        let providerChunk;

        beforeAll(async () => {
            providerChunk = ProviderChunk.new();

            providerChunk.id = randomHash();
            providerChunk.real_id = randomHash();
            providerChunk.pub_key = randomHash();
            providerChunk.segment_hashes = [randomHash(), randomHash(), randomHash()];
            providerChunk.real_id_verified = false;
            providerChunk.length = 256000;
            providerChunk.real_length = 512000;

            await providerChunk.save();
        });

        it('updates a record in `providers` table', async () => {
            const updatedRealLength = 1024000;

            providerChunk.real_length = updatedRealLength;

            await providerChunk.save();

            const savedProviderChunks = await knex.select().from('provider_chunks').where('id', providerChunk.id);

            expect(savedProviderChunks).toBeInstanceOf(Array);
            expect(savedProviderChunks).toHaveLength(1);
            expect(savedProviderChunks[0]).toHaveProperty('real_length', updatedRealLength);
        });
    });

    describe('find or create and save', () => {
        const id = randomHash();
        let providerChunk;

        beforeAll(async () => {
            providerChunk = await ProviderChunk.findOrCreate(id);

            providerChunk.real_id = randomHash();
            providerChunk.pub_key = randomHash();
            providerChunk.segment_hashes = [randomHash(), randomHash(), randomHash()];
            providerChunk.real_id_verified = false;
            providerChunk.length = 256000;
            providerChunk.real_length = 512000;

            await providerChunk.save();
        });

        it('creates a new provider chunk on findOrCreate call', async () => {
            const savedProviderChunks = await knex.select().from('provider_chunks').where('id', providerChunk.id);

            expect(savedProviderChunks).toBeInstanceOf(Array);
            expect(savedProviderChunks).toHaveLength(1);
        });
    });
});
