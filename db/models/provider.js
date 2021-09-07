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

module.exports = Provider;
