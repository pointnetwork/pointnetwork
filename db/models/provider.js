const Model = require('../model');
const _ = require('lodash');
const Sequelize = require('sequelize');

class Provider extends Model {
    constructor(...args) {
        super(...args);
    }
}

Provider.init({
    id: { type: Sequelize.DataTypes.STRING, unique: true, primaryKey: true },
    connection: { type: Sequelize.DataTypes.STRING },
    address: { type: Sequelize.DataTypes.STRING },
}, {
    indexes: [
        { fields: ['address'] }
    ]
});

// async save() {
//     const {id, ...data} = this.toJSON();
//
//     if (typeof id === 'string' && id.includes('#')) {
//         data.address = data.address || ('0x' + id.split('#').pop()).slice(-42);
//         data.connection = data.connection || id;
//     }
//
//     if (isFinite(this._id)) {
//         data.id = this._id;
//     }
//
//     const [provider] = await knex('providers')
//         .insert(data)
//         .onConflict('id')
//         .merge()
//         .returning('*');
//
//     this._id = provider.id;
//
//     // legacy persist to LevelDB
//     super.save();
// }

module.exports = Provider;
