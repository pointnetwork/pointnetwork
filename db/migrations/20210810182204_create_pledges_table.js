exports.up = function(knex) {
    return knex.schema.createTable('pledges', function(table) {
        table.unique('id');
        table.string('id');
        // FK chunk_id references chunks table
        table.string('chunk_id').references('id').inTable('chunks');
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('pledges');
};
