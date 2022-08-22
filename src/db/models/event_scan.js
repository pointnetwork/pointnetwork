const Model = require('./base');
const Sequelize = require('sequelize');

class EventScan extends Model {
    constructor(...args) {
        super(...args);
    }
}

EventScan.init(
    {
        id: {type: Sequelize.DataTypes.STRING, unique: true, primaryKey: true},
        chain_id: {type: Sequelize.DataTypes.INTEGER, unique: false, allowNull: false},
        contract_address: {type: Sequelize.DataTypes.STRING, allowNull: false},
        from_block: {type: Sequelize.DataTypes.INTEGER, allowNull: false},
        to_block: {type: Sequelize.DataTypes.INTEGER, allowNull: false}
    },
    {
        indexes: [
            {fields: ['chain_id']},
            {fields: ['chain_id', 'from_block']},
            {fields: ['chain_id', 'to_block']},
            {fields: ['chain_id', 'contract_address', 'from_block']},
            {fields: ['chain_id', 'contract_address', 'to_block']}
        ]
    }
);

export {EventScan as default};