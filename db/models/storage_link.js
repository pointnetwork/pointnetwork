const Model = require('../model');
const _ = require('lodash');
const sublevel = require('sublevel');
const AutoIndex = require('level-auto-index');
const fs = require('fs');
const path = require('path');
const uploadingSteps = require('../../client/storage/uploading')
let Chunk;
let Redkey;

// State Machine Definitions
const { Machine, interpret, assign } = require('xstate');

const createStateMachine = (model) => {
  return Machine(
    {
      id: 'storageLink',
      initial: 'initialized',
      context: { model },
      states: {
        initialized: {
          on: {
            CREATE: 'created',
          }
        },
        created: {
          // save the model
          // send STORE_CHUNK_REQUEST
          // refresh the model
          // onSuccess -> set state to agreed
          // onError -> set state to failed
          // onError -> set .err to error string
          // save the model
          invoke: {
            id: 'SEND_STORE_CHUNK_REQUEST',
            src: (context, event) => uploadingSteps.SEND_STORE_CHUNK_REQUEST(event.chunk, context.model),
            onDone: {
              actions: 'REFRESH_MODEL',
              target: 'agreed',
            },
            onError: {
              actions: ['REFRESH_MODEL', 'UPDATE_MODEL_ERR_CONTEXT'],
              target: 'failed',
            }
          },
          enter: 'SAVE_MODEL',
          exit: 'SAVE_MODEL'
        },
        agreed: {
          on: {
            ENCRYPT: 'encrypting'
          },
          enter: ['UPDATE_LEGACY_STATUS_AGREED', 'SAVE_MODEL']
        },
        encrypting: {},
        success: {
          type: 'final'
        },
        failed: {
          type: 'final'
        }
      }
    },
    {
      actions: {
        SAVE_MODEL: async () => {
          console.log(`Saving the model from the state machine`)
          await model.save()
        },
        REFRESH_MODEL: async () => {
          console.log(`Refresing the model from the state machine`)
          await model.refresh()
        },
        UPDATE_LEGACY_STATUS_AGREED: assign({
          model: {
            status: StorageLink.STATUS_AGREED
          }
        }),
        UPDATE_MODEL_ERR_CONTEXT: assign({
          model: {
            err: (context, event) => event.data.err
          }
        })
      }
    }
  )
}

class StorageLink extends Model {

    constructor(...args) {
        super(...args);

        // This is to avoid circular dependencies:
        Chunk = require('./chunk');
        Redkey = require('./redkey');

        // create a state machine using the factory
        this._stateMachine = createStateMachine(this)

        this._storageLinkService = interpret(this._stateMachine).onTransition(state => console.log(`Current State: ${state.value}`))

        // start the storage link machine service
        this._storageLinkService.start()
    }

    get stateMachine() {
        return this._storageLinkService
    }

    get currentState() {
        return this._storageLinkService.state.value
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