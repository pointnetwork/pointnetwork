const ctx = require('../_helpers/db/setup');
const truncate = require('../_helpers/db/truncate');
const DB = require('../../db');
const db = new DB(ctx);
const { v4: uuid } = require('uuid');

describe('Provider model', () => {
    let Provider;
    const providerObj = {
        id: uuid(),
        address: '0xB87C8Ec8cd1C33EB9548490D64623a63Fd757415',
        connection: `http://localhost:12345/#${this.address}`
    }

    beforeAll(async () => {
        await db.init();
        Provider = require('../../db/models/provider');
    })

    afterEach(async () => {
        truncate(Provider);
    });

    afterAll(async () => {
        db.shutdown();
    });

    describe('create', () => {
        beforeAll(async () => {
            await Provider.create(providerObj);
        });

        it('creates a record in `providers` table', async () => {
            const providers = await Provider.findAll()

            expect(providers).toBeInstanceOf(Array);
            expect(providers).toHaveLength(1);

            const [savedProvider] = providers;

            expect(savedProvider).toHaveProperty('id', providerObj.id);
            expect(savedProvider).toHaveProperty('address', providerObj.address);
            expect(savedProvider).toHaveProperty('connection', providerObj.connection);
        });
    });

    describe('update', () => {
        let provider;

        beforeAll(async () => {
            provider = await Provider.create(providerObj);
        });

        it('updates a record in `providers` table', async () => {
            const updatedConnection = provider.connection.replace('localhost', '127.0.0.1');

            provider.connection = updatedConnection;
            await provider.save();

            savedProvider = await Provider.find(providerObj.id)

            expect(savedProvider).toBeInstanceOf(Provider);
            expect(savedProvider).toHaveProperty('connection', updatedConnection);
        });
    });

    describe('findOrCreate', () => {
        beforeAll(async () => {
                await Provider.findOrCreate({ where: { id: providerObj.id }, defaults: { ...providerObj } })
            }
        );

        it('extracts address and connection string from a string id and saves correct provider fields', async () => {
            const savedProviders = await Provider.findAll();

            expect(savedProviders).toBeInstanceOf(Array);
            expect(savedProviders).toHaveLength(1);

            const [savedProvider] = savedProviders;

            expect(savedProvider).toHaveProperty('id', providerObj.id);
            expect(savedProvider).toHaveProperty('connection', providerObj.connection);
            expect(savedProvider).toHaveProperty('address', providerObj.address);
        });
    });
});
