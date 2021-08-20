exports.up = function(knex) {
    return knex.schema.createTable('redkeys', function(table) {
        table.increments('id');
        table.integer('provider_id').references('id').inTable('providers');
        table.text('private_key'); // todo: should be binary
        table.text('public_key'); // todo: should be binary
        table.integer('key_index');
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('redkeys');
};
