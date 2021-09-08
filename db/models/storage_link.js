const Model = require('../model');
const _ = require('lodash');
const fs = require('fs');
const { interpret } = require('xstate');
const Sequelize = require('sequelize');
const utils = require('#utils');
let Chunk = require('./chunk'), Provider = require('./provider'), Redkey = require('./redkey');

class StorageLink extends Model {
    constructor(...args) {
        super(...args);
    }

    initStateMachine(chunk) {
        // create a state machine using the factory
        this._stateMachine = storageLinkMachine.createStateMachine(this, chunk);

        this._storageLinkService = interpret(this._stateMachine);//.onTransition(state => console.log(`Current State: ${state.value}`))

        // start the storage link machine service
        this._storageLinkService.start();
    }

    get machine() {
        return this._storageLinkService;
    }

    get state() { // todo: won't you get confused with state/status?
        return this.machine.state.value;
    }

    get hasFailed() {
        return this.machine.state.value === StorageLink.STATUS_FAILED;
    }

    static async byChunkIdAndStatus(chunk_id, status) {
        let where = {
            chunk_id: chunk_id
        }

        if (status !== 'all') {
            where.status = status;
        }

        return await StorageLink.findAll({ where });
    }

    getEncryptedData() {
        return fs.readFileSync(Chunk.getChunkStoragePath(this.chunk_id)+'.'+this.id+'.enc', { encoding: null });
    }

    validatePledge() {
        // todo: make sure this.chunk_id is not null
        // todo: check this.pledge.conditions as well and make sure they're signed off on
        const contact = utils.urlToContact(this.provider_id);
        const publicKey = Buffer.from(contact[0], 'hex');
        const message = [ 'STORAGE', 'PLEDGE', this.pledge.conditions.chunk_id, 'time' ];

        const vrs = utils.deserializeSignature(this.pledge.signature);

        if (utils.verifyPointSignature(message, vrs, publicKey, this.chainId) !== true) {
            throw new Error('recovered public key does not match provided one');
        }
    }

    async getRedkeyOrFail() {
        return await Redkey.findOrFail(this.redkey_id);
    }
}

StorageLink.init({
    id: { type: Sequelize.DataTypes.BIGINT, unique: true, primaryKey: true, autoIncrement: true },
    // chunk_id: { type: Sequelize.DataTypes.STRING, references: { model: 'Chunk', key: 'id' } },
    // provider_id: { type: Sequelize.DataTypes.BIGINT, references: { model: 'Provider', key: 'id' } },
    // redkey_id: { type: Sequelize.DataTypes.BIGINT, references: { model: 'Redkey', key: 'id' } },
    status: { type: Sequelize.DataTypes.STRING },
    encrypted_length: { type: Sequelize.DataTypes.INTEGER, allowNull: true },
    segments_sent: { type: Sequelize.DataTypes.JSON, allowNull: true },
    segments_received: { type: Sequelize.DataTypes.JSON, allowNull: true },
    segment_hashes: { type: Sequelize.DataTypes.JSON, allowNull: true },
    merkle_tree: { type: Sequelize.DataTypes.JSON, allowNull: true },
    merkle_root: { type: Sequelize.DataTypes.STRING, allowNull: true },

    // todo:
    // table.text('segments_sent');
    // table.text('segments_received');
    // table.specificType('segment_hashes', 'varchar[]');
    // table.specificType('merkle_tree', 'varchar[]');
    // table.string('merkle_root');

}, {
    indexes: [
        { fields: ['status'] },
        { fields: ['chunk_id', 'status'] },
        { fields: ['merkle_root'] },
    ]
});

StorageLink.belongsTo(Chunk);
StorageLink.belongsTo(Provider);
StorageLink.belongsTo(Redkey);

StorageLink.STATUS_ALL = 'all';
StorageLink.STATUS_CREATED = 'created'; // candidates
StorageLink.STATUS_ESTABLISH_PAYMENT_CHANNEL = 'establish_payment_channel';
StorageLink.STATUS_AGREED = 'agreed';
StorageLink.STATUS_ENCRYPTING = 'encrypting';
StorageLink.STATUS_ENCRYPTED = 'encrypted';
StorageLink.STATUS_SENDING_SEGMENT_MAP = 'sending_segment_map';
StorageLink.STATUS_SENDING_DATA = 'sending_data';
StorageLink.STATUS_DATA_RECEIVED = 'data_received';
StorageLink.STATUS_ASKING_FOR_SIGNATURE = 'asking_for_signature';
StorageLink.STATUS_SIGNED = 'signed';
StorageLink.STATUS_FAILED = 'failed';

StorageLink.allStatuses = () => {
    let statuses = [];
    for(let i in StorageLink) {
        if (_.startsWith(i, 'STATUS_') && i !== 'STATUS_ALL') {
            statuses.push(StorageLink[i]);
        }
    }
    return statuses;
};

module.exports = StorageLink;

// require statement declared after module.exports to avoid circular dependencies
const { storageLinkMachine } = require('../../client/storage/machines');
