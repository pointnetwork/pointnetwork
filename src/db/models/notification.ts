import Sequelize from 'sequelize';
const Model = require('./base');

const {INTEGER, STRING, JSON, DATE, BOOLEAN} = Sequelize.DataTypes;

class Notification extends Model<{
    id: number;
    block_number: string;
    timestamp: number;
    identity: string;
    address: string;
    contract: string;
    event: string;
    arguments: Record<string, unknown>;
    viewed: boolean;
    log: Record<string, unknown>;
}> {
    constructor(...args: unknown[]) {
        super(...args);
    }
}

Notification.init({
    id: {type: INTEGER, autoIncrement: true, primaryKey: true},
    block_number: {type: STRING, allowNull: false},
    timestamp: {type: DATE, allowNull: false},
    identity: {type: STRING, allowNull: true},
    address: {type: STRING, allowNull: false},
    contract: {type: STRING, allowNull: true},
    event: {type: STRING, allowNull: true},
    title: {type: STRING, allowNull: true},
    text: {type: STRING, allowNull: true},
    link: {type: STRING, allowNull: true},
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
