// State Machine Definitions
const { Machine } = require('xstate');

exports.createStateMachine = function createStateMachine(model, storage) {
  return Machine(
    {
      id: 'storageLink',
      initial: 'initialized',
      states: {
        initialized: {
          on: {
            CREATE: 'created',
          },
          exit: 'UPDATE_LEGACY_STATUS'
        },
        created: {
          invoke: {
            id: 'SEND_STORE_CHUNK_REQUEST',
            src: async (context, event) => {
              await model.save()
              return storage.SEND_STORE_CHUNK_REQUEST(event.chunk, model)
            },
            onDone: {
              target: 'agreed',
            },
            onError: {
              actions: 'UPDATE_MODEL_ERR',
              target: 'failed',
            }
          },
          exit: 'UPDATE_LEGACY_STATUS'
        },
        agreed: {
          invoke: {
            id: 'SAVE_MODEL_AGREED_STATE',
            src: (context, event) => model.save()
          },
          on: {
            ENCRYPT: 'encrypting'
          },
          exit: 'UPDATE_LEGACY_STATUS'
        },
        encrypting: {
          invoke: {
            id: 'ENCRYPT_CHUNK',
            src: async (context, event) => {
              await model.save()
              return storage.ENCRYPT_CHUNK(event.chunk, model)
            },
            onDone: {
              target: 'encrypted'
            },
            onError: {
              target: 'failed'
            }
          },
          exit: 'UPDATE_LEGACY_STATUS'
        },
        encrypted: {
          invoke: {
            id: 'SAVE_MODEL_ENCRYPTED_STATE',
            src: (context, event) => model.save()
          },
          on: {
            SEND_SEGMENT_MAP: 'sending_segment_map'
          },
          exit: 'UPDATE_LEGACY_STATUS'
        },
        sending_segment_map: {
          invoke: {
            id: 'SEND_STORE_CHUNK_SEGMENTS',
            src: async (context, event) => {
              await model.save()
              return storage.SEND_STORE_CHUNK_SEGMENTS(event.data, model)
            },
            onDone: {
              target: 'pre_sending_data',
            },
            onError: {
              actions: 'UPDATE_MODEL_ERR',
              target: 'failed',
            },
            onError: {
              actions: 'UPDATE_MODEL_ERR',
              target: 'data_received',
              cond: 'nodeAlreadyStoredData'
            }
          } // no exit here since we need an intermediate state (pre_sending_data)
        },
        pre_sending_data: {
          invoke: {
            id: 'SAVE_MODEL_PRE_SENDING_DATA',
            src: (context, event) => {
              model.status = 'sending_data' // hack to get the storage layer to work
              model.save()
            }
          },
          on: {
            SEND_DATA: 'sending_data'
          }
        },
        sending_data: {
          invoke: {
            id: 'SEND_STORE_CHUNK_DATA',
            src: async (context, event) => {
              await model.save()
              return storage.SEND_STORE_CHUNK_DATA(event.data, model)
            },
            onDone: {
              target: 'data_received',
            },
            onError: {
              actions: 'UPDATE_MODEL_ERR',
              target: 'failed',
            },
          },
          exit: 'UPDATE_LEGACY_STATUS'
        },
        data_received: {
          invoke: {
            id: 'SAVE_MODEL_DATA_RECEIVED',
            src: (context, event) => model.save()
          },
          exit: 'UPDATE_LEGACY_STATUS'
        },
        success: {
          type: 'final'
        },
        failed: {
          type: 'final'
        },
      },
    },
    {
      actions: {
        UPDATE_LEGACY_STATUS: async () => {
          model.status = model.state
        },
        UPDATE_MODEL_ERR: async (context, event) => {
          model.err = event.data
        },
      },
      guards: {
        nodeAlreadyStoredData: (context, event) => {
          _.startsWith(event.data, 'ECHUNKALREADYSTORED')
        }
      }
    }
  )
}