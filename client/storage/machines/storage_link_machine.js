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
          }
        },
        created: {
          invoke: {
            id: 'SEND_STORE_CHUNK_REQUEST',
            src: (context, event) => storage.SEND_STORE_CHUNK_REQUEST(event.chunk, model),
            onDone: {
              actions: 'REFRESH_MODEL',
              target: 'agreed',
            },
            onError: {
              actions: 'UPDATE_MODEL_ERR',
              target: 'failed',
            }
          },
          entry: 'UPDATE_LEGACY_STATUS',
          exit: 'SAVE_MODEL'
        },
        agreed: {
          on: {
            ENCRYPT: 'encrypting'
          },
          entry: 'UPDATE_LEGACY_STATUS'
        },
        encrypting: {
          invoke: {
            id: 'ENCRYPT_CHUNK',
            src: (context, event) => storage.ENCRYPT_CHUNK(event.chunk, model),
            onDone: {
              actions: 'REFRESH_MODEL',
              target: 'encrypted'
            },
            onError: {
              target: 'failed'
            }
          },
          entry: 'UPDATE_LEGACY_STATUS',
          exit: 'SAVE_MODEL'
        },
        encrypted: {
          entry: 'UPDATE_LEGACY_STATUS'
        },
        success: {
          type: 'final'
        },
        failed: {
          type: 'final',
          entry: 'UPDATE_LEGACY_STATUS'
        },
      },
    },
    {
      actions: {
        SAVE_MODEL: async () => {
          await model.save()
        },
        REFRESH_MODEL: async () => {
          await model.refresh()
        },
        UPDATE_LEGACY_STATUS: async () => {
          model.status = model.state
          await model.save()
        },
        UPDATE_MODEL_ERR: async (context, event) => {
          model.err = event.data
        },
      }
    }
  )
}