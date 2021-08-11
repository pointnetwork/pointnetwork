exports.up = function(knex) {
    return knex.schema.createTable('pledges', function(table) {
        table.unique('id');
        table.string('id');
        table.string('chunkId').notNullable();
        
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('pledges');
};
