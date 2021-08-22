exports.up = function(knex) {
    return knex.schema.createTable('providers', function(table) {
        table.increments('id');
        table.string('connection');
        table.string('address');
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('providers');
};
