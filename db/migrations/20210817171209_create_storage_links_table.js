exports.up = function(knex) {
    return knex.schema.createTable('storage_links', function(table) {
        table.unique('id');
        table.string('id');
        // table.string('original_path').notNullable();
        table.string('status');
        table.string('encrypted_hash');
        table.text('segments_sent');
        table.text('segments_received');
        table.integer('encrypted_length');
        table.specificType('segment_hashes', 'varchar[]');
        table.specificType('merkle_tree', 'varchar[]');
        table.string('merkle_root');

        // Foreign keys.
        table.integer('provider_id').references('id').inTable('providers');
        table.integer('redkey_id').references('id').inTable('redkeys');
        table.string('chunk_id').references('id').inTable('chunks');
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('storage_links');
};
