const knex = require('../../db/knex');
const DB = require('../../db');
const Model = require('../../db/model');
const StorageLink = require('../../db/models/storage_link');

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

describe('Storage link model', () => {
    afterEach(async () => {
        await knex('storage_links').delete();
    });

    afterAll(async () => {
        await knex.destroy();
    });

    describe('create', () => {
        let storage_link;

        beforeAll(async () => {
            storage_link = StorageLink.new();
        });
    });
});
