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
        const {id, ...data} = this.toJSON();

        if (typeof id === 'string' && id.includes('#')) {
            data.address = data.address || ('0x' + id.split('#').pop()).slice(-42);
            data.connection = data.connection || id;
        }

        if (isFinite(this._id)) {
            data.id = this._id;
        }

        const [provider] = await knex('providers')
            .insert(data)
            .onConflict('id')
            .merge()
            .returning('*');

        this._id = provider.id;

        // legacy persist to LevelDB
        super.save();
    }
}

Provider.tableName = 'provider';

module.exports = Provider;
