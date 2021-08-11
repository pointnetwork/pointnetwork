exports.up = function(knex) {
    return knex.schema.createTable('providers', function(table) {
        table.unique('id');
        table.string('id');

        table.string('connection');
        table.string('address');
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('providers');
};
