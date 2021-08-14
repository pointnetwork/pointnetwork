exports.up = function(knex) {
    return knex.schema.createTable('files', function(table) {
        table.increments('id').primary().unsigned();
        table.string('leveldb_id');
        table.text('original_path').notNullable();
        table.text('directory').notNullable();
        table.enu('type', ['file', 'dir', 'fileptr', 'dirptr']);
        table.string('host');
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
