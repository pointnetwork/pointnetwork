exports.up = function(knex) {
    return knex.schema.createTable('chunks', function(table) {
        table.increments('id').primary().unsigned();
        table.string('leveldb_id');
        table.integer('length');
        table.integer('redundancy');
        table.specificType('expires', 'bigint');
        table.boolean('autorenew');
        table.string('dl_status');
        table.string('ul_status');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        // FK file_id references files table
        table.integer('file_id').references('id').inTable('files');
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('chunks');
};