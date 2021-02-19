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
          // save the model
          // send STORE_CHUNK_REQUEST
          // refresh the model
          // onSuccess -> set state to agreed
          // onError -> set state to failed
          // onError -> set .err to error string
          // save the model
          invoke: {
            id: 'SEND_STORE_CHUNK_REQUEST',
            src: (context, event) => storage.SEND_STORE_CHUNK_REQUEST(event.chunk, model),
            onDone: {
              // actions: 'REFRESH_MODEL',
              target: 'agreed',
            },
            onError: {
              actions: 'UPDATE_MODEL_ERR',
              target: 'failed',
            }
          },
          entry: ['UPDATE_LEGACY_STATUS', 'SAVE_MODEL'],
          exit: 'SAVE_MODEL'
        },
        agreed: {
          on: {
            ENCRYPT: 'encrypting'
          },
          entry: 'UPDATE_LEGACY_STATUS'
        },
        encrypting: {},
        success: {
          type: 'final'
        },
        failed: {
          type: 'final',
          entry: 'UPDATE_LEGACY_STATUS'
        }
      }
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