const crypto = require('crypto');
const ctx = require('../_helpers/db/setup');
const truncate = require('../_helpers/db/truncate');
const DB = require('../../db');
const db = new DB(ctx);

const randomHash = () => (
    crypto.createHash('sha1').update(Date.now().toString() + Math.random().toString()).digest('hex')
);

describe('ProviderChunk model', () => {
    let ProviderChunk;
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

    describe('update', () => {
        let providerChunk;

        beforeAll(async () => {
            providerChunk = await ProviderChunk.create(providerChunkObj);
        });

        it('updates a record in `providers` table', async () => {
            const updatedRealSize = 1024000;

            providerChunk.real_size = updatedRealSize;

            await providerChunk.save();

            const savedProviderChunks = await ProviderChunk.find(providerChunkObj.id)

            expect(savedProviderChunks).toBeInstanceOf(ProviderChunk);
            expect(savedProviderChunks).toHaveProperty('real_size', updatedRealSize);
        });
    });

    describe('find or create and save', () => {
        beforeAll(async () => {
            await ProviderChunk.findOrCreate({ where: { id: providerChunkObj.id }, defaults: { ...providerChunkObj } })
        });

        it('creates a new provider chunk on findOrCreate call', async () => {
            const savedProviderChunks = await ProviderChunk.findAll();

            expect(savedProviderChunks).toBeInstanceOf(Array);
            expect(savedProviderChunks).toHaveLength(1);
        });
    });
});
