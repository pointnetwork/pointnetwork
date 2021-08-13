exports.up = function(knex) {
    return knex.schema.createTable('files', function(table) {
        table.increments('id').primary().unsigned();
        table.string('leveldb_id');
        table.unique('leveldb_id');
        table.text('original_path').notNullable();
        table.integer('size');
        table.integer('redundancy');
        table.specificType('expires', 'bigint');
        table.boolean('autorenew');
        table.string('ul_status');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('files');
};
