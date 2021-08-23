const Model = require('../model');
const _ = require('lodash');
const sublevel = require('sublevel');
const AutoIndex = require('level-auto-index');
const fs = require('fs');
const path = require('path');
const { interpret } = require('xstate');
const knex = require('../knex');

class StorageLink extends Model {
    constructor(...args) {
        super(...args);
    }

    async save() {
        // save to postgres via knex
        const attrs = (({ id, status, segments_sent, segments_received, encrypted_hash, encrypted_length, segment_hashes, merkle_tree, merkle_root, provider_id, redkey_id, chunk_id }) => ({ id, status, segments_sent: JSON.stringify(segments_sent), segments_received: JSON.stringify(segments_received), encrypted_hash, encrypted_length, segment_hashes, merkle_tree, merkle_root, provider_id, redkey_id: this.redkeyId, chunk_id}))(super.toJSON());

        if (typeof attrs.provider_id === 'string' && attrs.provider_id.includes('#')) {
            const address = ('0x' + attrs.provider_id.split('#').pop()).slice(-42);
            const connection = attrs.provider_id;
            const [{id: provider_id} = {}] = await knex('providers').select('id').where({address, connection});

            if (!provider_id) {
                throw new Error(`Unable to find provider by id: "${provider_id}"`);
            }

            const [{id: redkey_id} = {}] = await knex('redkeys').select('id').where({provider_id});

            if (!redkey_id) {
                throw new Error(`Unable to find redkey by provider id: "${provider_id}"`);
            }

            attrs.provider_id = provider_id;
            attrs.redkey_id = redkey_id;
        }

        await knex('storage_links')
            .insert(attrs)
            .onConflict("id")
            .merge()
            .returning("*");


        if (this.pledge !== undefined) {
            await knex('chunks')
                .where('id', this.chunk_id)
                .update({
                    pledge: this.pledge.signature,
                    pledge_conditions: JSON.stringify(this.pledge.conditions)
                });
        }

        // legacy persist to LevelDB
        await super.save();
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

    get state() {
        return this.machine.state.value;
    }

    get hasFailed() {
        return this.machine.state.value == 'failed';
    }

    static _buildIndices() {
        const reducer = x => (!!x.chunk_id && !!x.status && x.id) ? x.chunk_id + '_' + x.status + '!' + x.id : void 0;
        this._addIndex('chunkIdAndStatus', reducer);
    }

    static async byChunkIdAndStatus(chunk_id, status) {
        return await this.allBy('chunkIdAndStatus', chunk_id + '_' + status);
    }

    getEncryptedData() {
        return fs.readFileSync(Chunk.getChunkStoragePath(this.chunk_id)+'.'+this.id+'.enc');
    }

    validatePledge() {
        // todo: make sure this.chunk_id is not null
        // todo: check this.pledge.conditions as well and make sure they're signed off on
        const contact = this.ctx.utils.urlToContact(this.provider_id);
        const publicKey = Buffer.from(contact[0], 'hex');
        const message = [ 'STORAGE', 'PLEDGE', this.pledge.conditions.chunk_id, 'time' ];

        const vrs = this.ctx.utils.deserializeSignature(this.pledge.signature);

        if (this.ctx.utils.verifyPointSignature(message, vrs, publicKey, this.chainId) !== true) {
            throw new Error('recovered public key does not match provided one');
        }
    }

    async getChunk() {
        return await Chunk.find(this.chunk_id);
    }

    async getRedkey() {
        if (this.redkeyId === null) throw new Error('No provider redundancy key set for storage_link '+this.id);
        const key = await Redkey.find(this.redkeyId);
        if (key === null) throw new Error('Provider redundancy key for storage_link '+this.id+' not found');
        return key;
    }

    setProvider(provider) {
        this._attributes.provider_id = provider.id;
    }
    async getProvider() {
        return await this.ctx.db.provider.find(this._attributes.provider_id);
    }
}

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
const Chunk = require('./chunk');
const Redkey = require('./redkey');
