exports.up = function(knex) {
    return knex.schema.createTable('files', function(table) {
        table.unique('id');
        table.string('id');
        table.text('original_path').notNullable();
        table.text('parent_dir').notNullable();
        table.enu('type', ['file', 'dir']);
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
