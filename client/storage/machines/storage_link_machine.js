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
            src: (context, event) => storage.SEND_STORE_CHUNK_REQUEST(event.chunk, model),
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
      }
    }
  )
}