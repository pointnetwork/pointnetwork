const ctx = require('../_helpers/db/setup');
const truncate = require('../_helpers/db/truncate');
const DB = require('../../db');
const db = new DB(ctx);
const {v4: uuid} = require('uuid');

let Provider;

const generateProvider = async () => await Provider.create({
    id: uuid(),
    address: '0xB87C8Ec8cd1C33EB9548490D64623a63Fd757415',
    connection: `http://localhost:12345/#${this.address}`
});

describe('RedKey model', () => {
    let RedKey;

    const redKeyObj = {
        id: '1',
        index: 42,
        provider_id: undefined,
        private_key: 'foo',
        public_key: 'bar'
    };

    beforeAll(async () => {
        await db.init();
        RedKey = require('../../db/models/redkey');
        Provider = require('../../db/models/provider');
    });

    afterEach(async () => {
        truncate(RedKey);
        truncate(Provider);
    });

    afterAll(async () => {
        db.shutdown();
    });

    describe('create', () => {
        let provider;

        beforeAll(async () => {
            provider = await generateProvider();
            redKeyObj.provider_id = provider.id;
            await RedKey.create(redKeyObj);
        });

        it('creates a record in `redkeys` table', async () => {
            const redKeys = await RedKey.findAll();

            expect(redKeys).toBeInstanceOf(Array);
            expect(redKeys).toHaveLength(1);

            const [savedRedKey] = redKeys;

            expect(savedRedKey).toHaveProperty('id', redKeyObj.id);
            expect(savedRedKey).toHaveProperty('provider_id', provider.id);
            expect(savedRedKey).toHaveProperty('private_key', redKeyObj.private_key);
            expect(savedRedKey).toHaveProperty('public_key', redKeyObj.public_key);
            expect(savedRedKey).toHaveProperty('index', redKeyObj.index);
        });
    });

    describe('update', () => {
        let redKey;
        let provider;

        beforeAll(async () => {
            provider = await generateProvider();
            redKeyObj.provider_id = provider.id;
            redKey = await RedKey.create(redKeyObj);
        });

        it('updates a record in `redkeys` table', async () => {
            const updatedIndex = 1337;

            redKey.index = updatedIndex;
            await redKey.save();

            const savedRedKeys = await RedKey.find(redKeyObj.id);

            expect(savedRedKeys).toBeInstanceOf(RedKey);
            expect(savedRedKeys).toHaveProperty('index', updatedIndex);
        });
    });

    describe('generate one for provider', () => {
        beforeAll(async () => {
            generatedRedKeys = await RedKey.generateNewForProvider();
        });

        it('creates redkey and sets correct provider id', async () => {
            expect(generatedRedKeys.publicKey).toMatch('-----BEGIN PUBLIC KEY-----');
            expect(generatedRedKeys.privateKey).toMatch('-----BEGIN PRIVATE KEY-----');
        });
    });
});
