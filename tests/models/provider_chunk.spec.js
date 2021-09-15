const crypto = require('crypto');
const ctx = require('../_helpers/db/setup');
const truncate = require('../_helpers/db/truncate');
const DB = require('../../db');
const db = new DB(ctx);
const { v4: uuid } = require('uuid');

const randomHash = () => (
    crypto.createHash('sha1').update(Date.now().toString() + Math.random().toString()).digest('hex')
);

describe('ProviderChunk model', () => {
    let ProviderChunk;

    beforeAll(async () => {
        await db.init();
        ProviderChunk = require('../../db/models/provider_chunk');
    })

    afterEach(async () => {
        truncate(ProviderChunk);
    });

    afterAll(async () => {
        db.shutdown();
    });

    describe('create', () => {
        const providerChunkObj = {
            id: randomHash(),
            real_id: randomHash(),
            public_key: randomHash(),
            segment_hashes: [randomHash(), randomHash(), randomHash()],
            real_id_verified: false,
            size: 256000,
            real_size: 512000
        }

        beforeAll(async () => {
            await ProviderChunk.create(providerChunkObj);
        });

        it('creates a record in `provider_chunks` table', async () => {
            const savedProviderChunks = await ProviderChunk.findAll();

            expect(savedProviderChunks).toBeInstanceOf(Array);
            expect(savedProviderChunks).toHaveLength(1);

            const [savedProviderChunk] = savedProviderChunks;

            expect(savedProviderChunk).toHaveProperty('id', providerChunkObj.id);
            expect(savedProviderChunk).toHaveProperty('real_id', providerChunkObj.real_id);
            expect(savedProviderChunk).toHaveProperty('public_key', providerChunkObj.public_key);
            expect(savedProviderChunk).toHaveProperty('segment_hashes');
            expect(savedProviderChunk.segment_hashes).toEqual(expect.arrayContaining(providerChunkObj.segment_hashes));
            expect(savedProviderChunk).toHaveProperty('real_id_verified', providerChunkObj.real_id_verified);
            expect(savedProviderChunk).toHaveProperty('size', providerChunkObj.size);
            expect(savedProviderChunk).toHaveProperty('real_size', providerChunkObj.real_size);
        });
    });

    xdescribe('update', () => {
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

    xdescribe('find or create and save', () => {
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
