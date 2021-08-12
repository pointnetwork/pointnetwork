const Model = require('../model');
const knex = require('../knex');
const _ = require('lodash');

class Provider extends Model {
    constructor(...args) {
        super(...args);
    }

    static _buildIndices() {
        // this._addIndex('provider');
    }

    async save() {
        const {id, connection, address} = this.toJSON();

        const [provider] = await knex('providers')
            .insert({id, connection, address})
            .onConflict('id')
            .merge()
            .returning('*');

        // legacy persist to LevelDB
        super.save();

        return provider;
    }
}

Provider.tableName = 'provider';

module.exports = Provider;
