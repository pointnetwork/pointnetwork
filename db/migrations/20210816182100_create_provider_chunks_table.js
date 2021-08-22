const ProviderChunk = require('../models/provider_chunk');

exports.up = function(knex) {
    return knex.schema.createTable('provider_chunks', function(table) {
        table.unique('id');
        table.string('id');
        table.text('public_key'); // todo: should be binary
        table.unique('real_id');
        table.string('real_id');
        table.specificType('segment_hashes', 'varchar(255)[]');
        table.boolean('real_id_verified');
        table.integer('length');
        table.integer('real_length');
        table.enum('status', Object.values(ProviderChunk.STATUSES));
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('provider_chunks');
};
