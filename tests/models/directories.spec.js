const tmp = require('tmp');
const fs = require('fs');
const path = require('path');
const knex = require('../../db/knex');
const Model = require('../../db/model');
const Directory = require('../../db/models/directory');

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

describe('Directory model', () => {
    afterEach(async () => {
        await knex('files').delete();
    });

    afterAll(async () => {
        await knex.destroy();
    });

    describe('create', () => {
        let directory;

        beforeAll(async () => {
            const tmpdir = tmp.dirSync();
            const tmpfile = tmp.fileSync({dir: tmpdir.name});
            fs.appendFileSync(tmpfile.name, 'foobar', (err) => {if (err) throw err;});
            
            directory = new Directory();
            directory.setHost('foo');
            directory.setOriginalPath(tmpdir.name);
            directory.addFilesFromOriginalPath();

            await directory.save();
        });

        it('creates a record in `files` table of `type` `dir` (directory)', async () => {
            const directories = await knex('files').where('type', 'dir').select();

            expect(directories).toBeInstanceOf(Array);
            expect(directories).toHaveLength(1);

            const [savedDirectory] = directories;

            expect(savedDirectory).toHaveProperty('id', directory.id);
            expect(savedDirectory).toHaveProperty('type', 'dir');
            expect(savedDirectory).toHaveProperty('host', 'foo');
            expect(savedDirectory).toHaveProperty('original_path', directory.originalPath);
            expect(savedDirectory).toHaveProperty('parent_dir', path.join(directory.originalPath, '..'));
            expect(savedDirectory).toHaveProperty('size', directory.size);
        });
    });

    describe('update', () => {
        let directory;

        beforeAll(async () => {
            const tmpdir = tmp.dirSync();
            const tmpfile = tmp.fileSync({dir: tmpdir.name});
            fs.appendFileSync(tmpfile.name, 'foobar', (err) => {if (err) throw err;});
            
            directory = new Directory();
            directory.setHost('foo');
            directory.setOriginalPath(tmpdir.name);
            directory.addFilesFromOriginalPath();

            await directory.save();
        });

        it('updates a record in `files` table for directories', async () => {
            const newHost = 'bar';
            directory.setHost(newHost);
            await directory.save();

            const savedDirectories = await knex.select().from('files').where('id', directory.id);

            expect(savedDirectories).toBeInstanceOf(Array);
            expect(savedDirectories).toHaveLength(1);
            expect(savedDirectories[0]).toHaveProperty('host', newHost);
        });
    });
});
