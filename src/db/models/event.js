const Model = require('./base');
const Sequelize = require('sequelize');
const {Op} = require('sequelize');

class Event extends Model {
    constructor(...args) {
        super(...args);
    }
}

Event.init(
    {
        id: {type: Sequelize.DataTypes.STRING, unique: true, primaryKey: true},
        raw_id: {type: Sequelize.DataTypes.STRING, allowNull: true},
        chain_id: {type: Sequelize.DataTypes.INTEGER, allowNull: false},
        contract_address: {type: Sequelize.DataTypes.STRING, allowNull: false},
        block_number: {type: Sequelize.DataTypes.INTEGER, allowNull: false},
        transaction_hash: {type: Sequelize.DataTypes.STRING, allowNull: false},
        transaction_index: {type: Sequelize.DataTypes.INTEGER, allowNull: false},
        block_hash: {type: Sequelize.DataTypes.STRING, allowNull: false},
        log_index: {type: Sequelize.DataTypes.INTEGER, allowNull: false},
        removed: {type: Sequelize.DataTypes.BOOLEAN, allowNull: false},
        return_values: {type: Sequelize.DataTypes.JSON, allowNull: true},
        event: {type: Sequelize.DataTypes.STRING, allowNull: true},
        signature: {type: Sequelize.DataTypes.STRING, allowNull: true},
        raw: {type: Sequelize.DataTypes.JSON, allowNull: true},
        topic0: {type: Sequelize.DataTypes.STRING, allowNull: true},
        topic1: {type: Sequelize.DataTypes.STRING, allowNull: true},
        topic2: {type: Sequelize.DataTypes.STRING, allowNull: true}
    },
    {
        indexes: [
            {fields: ['chain_id']},
            {fields: ['chain_id', 'block_number']},
            {fields: ['chain_id', 'log_index']},
            {fields: ['chain_id', 'contract_address', 'event']},
            {fields: ['chain_id', 'contract_address', 'event', 'log_index']},
            {fields: ['chain_id', 'contract_address', 'block_number']},
            {fields: ['chain_id', 'contract_address', 'event', 'block_number']},
            {fields: ['topic0']},
            {fields: ['topic1']},
            {fields: ['topic2']},
            {fields: ['chain_id', 'raw_id']}
        ]
    }
);

// Take events from the DB cache and return in native Eth format
Event.fetchCachedEvents = async(chain_id, contract_address, event, options) => {
    let fromBlock = options.fromBlock;
    let toBlock = options.toBlock;

    // make sure they're chronological, if not, swap
    let chronological = true;
    if (fromBlock > toBlock) {
        chronological = false;
        [fromBlock, toBlock] = [toBlock, fromBlock];
    }

    const evs = await Event.findAll({
        where: {
            contract_address,
            chain_id,
            event,
            [Op.and]: [
                {block_number: {[Op.gte]: fromBlock}},
                {block_number: {[Op.lte]: toBlock}}
            ]
        },
        order: [
            ['block_number', (chronological) ? 'ASC' : 'DESC']
        ]
    });

    return evs.map((ev) =>
        ({
            id: ev.raw_id,
            address: contract_address,
            blockNumber: ev.block_number,
            transactionHash: ev.transaction_hash,
            transactionIndex: ev.transaction_index,
            blockHash: ev.block_hash,
            logIndex: ev.log_index,
            removed: ev.removed,
            returnValues: ev.return_values,
            event: ev.event,
            signature: ev.signature,
            raw: ev.raw
        }));
};

export {Event as default};
