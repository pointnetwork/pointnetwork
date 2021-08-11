exports.up = function(knex) {
    return knex.schema.createTable('redkeys', function(table) {
        table.unique('id');
        table.string('id');

        table.string('provider_id').references('id').inTable('providers');
        table.string('private_key'); // todo: should be binary
        table.string('public_key'); // todo: should be binary
        table.integer('key_index');
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('redkeys');
};
