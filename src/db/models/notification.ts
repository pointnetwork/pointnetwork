import Model from './base';
import Sequelize from 'sequelize';

const {INTEGER, STRING, JSON, BOOLEAN} = Sequelize.DataTypes;

class Notification extends Model {}

Notification.init({
    id: {type: INTEGER, unique: true, primaryKey: true},
    block_number: {type: STRING, allowNull: false},
    timestamp: {type: INTEGER, allowNull: false},
    identity: {type: STRING, allowNull: true},
    address: {type: STRING, allowNull: false},
    contract: {type: STRING, allowNull: true},
    event: {type: STRING, allowNull: true},
    arguments: {type: JSON, allowNull: true},
    viewed: {type: BOOLEAN, allowNull: false, default: false},
    log: {type: JSON, allowNull: false}
}, {
    indexes: [
        {fields: ['id']},
        {fields: ['viewed']},
        {fields: ['address']},
        {fields: ['address', 'event']},
        {fields: ['identity']},
        {fields: ['identity', 'contract']},
        {fields: ['identity', 'contract', 'event']},
        {fields: ['block_number']},
        {fields: ['timestamp']}
    ]
});

export default Notification;
