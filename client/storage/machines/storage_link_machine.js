// State Machine Definitions
const { Machine } = require('xstate');

exports.createStateMachine = function createStateMachine(model, chunk, storage) {
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
              return storage.SEND_STORE_CHUNK_REQUEST(chunk, model)
            },
            onDone: {
              target: 'encrypting',
            },
            onError: {
              actions: 'UPDATE_MODEL_ERR',
              target: 'failed',
            }
          },
          exit: 'UPDATE_LEGACY_STATUS'
        },
        encrypting: {
          invoke: {
            id: 'ENCRYPT_CHUNK',
            src: async (context, event) => {
              await model.save()
              return storage.ENCRYPT_CHUNK(chunk, model)
            },
            onDone: {
              target: 'sending_segment_map'
            },
            onError: {
              target: 'failed'
            }
          },
          exit: 'UPDATE_LEGACY_STATUS'
        },
        sending_segment_map: {
          invoke: {
            id: 'SEND_STORE_CHUNK_SEGMENTS',
            src: async (context, event) => {
              await model.refresh()
              const key = await model.getRedkey();
              const data = [
                model.merkle_root,
                model.segment_hashes.map(x=>Buffer.from(x, 'hex')),
                model.encrypted_length,
                chunk.id,
                key.pub,
                chunk.length,
              ];
              return storage.SEND_STORE_CHUNK_SEGMENTS(data, model)
            },
            onDone: {
              target: 'sending_data',
            },
            onError: {
              actions: 'UPDATE_MODEL_ERR',
              target: 'failed',
            },
            onError: {
              actions: 'UPDATE_MODEL_ERR',
              target: 'asking_for_signature',
              cond: 'nodeAlreadyStoredData'
            }
          },
          exit: 'UPDATE_LEGACY_STATUS'
        },
        sending_data: {
          invoke: {
            id: 'SEND_STORE_CHUNK_DATA',
            src: async (context, event) => {
              if (!model.segments_sent) model.segments_sent = {};
              if (!model.segments_received) model.segments_received = [];

              const totalSegments = model.segment_hashes.length;
              let idx = -1;
              for(let i = 0; i < totalSegments; i++) {
                  if (!model.segments_sent[i]) {
                      idx = i; break;
                  }
                  // Retransmit timed out segments
                  // todo: give up after X attempts to retransmit
                  if (!storage.isProviderQueueFull(model.provider_id)) {
                      if (!model.segments_received.includes(i) && model.segments_sent[i] && model.segments_sent[i] + storage.config.retransmit_segments_timeout_seconds < Math.floor(Date.now()/1000)) {
                          console.log('retransmitting chunk', model.chunk_id, 'segment', i);
                          idx = i;
                          break
                      }
                  }
              }
              if (idx === -1) {
                  return
              }

              model.segments_sent[idx] = Math.floor(Date.now()/1000);
              await model.save();

              const encryptedData = model.getEncryptedData(); // todo: optimize using fs ranges // todo: use fs async

              const SEGMENT_SIZE_BYTES = storage.ctx.config.storage.segment_size_bytes;

              const data = [
                  model.merkle_root,
                  idx,
                  // Note: Buffer.slice is (start, end) not (start, length)
                  encryptedData.slice(idx * SEGMENT_SIZE_BYTES, idx * SEGMENT_SIZE_BYTES + SEGMENT_SIZE_BYTES),
              ];
              // await model.save()
              return storage.SEND_STORE_CHUNK_DATA(data, model)
            },
            onDone: {
              target: 'asking_for_signature',
            },
            onError: {
              actions: 'UPDATE_MODEL_ERR',
              target: 'failed',
            },
          },
          exit: 'UPDATE_LEGACY_STATUS'
        },
        asking_for_signature: {
          invoke: {
            id: 'SEND_STORE_CHUNK_SIGNATURE_REQUEST',
            src: async (context, event) => {
              await model.save()
              return storage.SEND_STORE_CHUNK_SIGNATURE_REQUEST(model)
            },
            onDone: {
              target: 'signed',
            },
            onError: {
              actions: 'UPDATE_MODEL_ERR',
              target: 'failed',
            },
          },
          exit: 'UPDATE_LEGACY_STATUS'
        },
        signed: {
          invoke: {
            id: 'SAVE_MODEL_SIGNED',
            src: async () => {
              await model.save()
              storage.uploadingChunksProcessing[chunk.id] = false;
              return chunk.reconsiderUploadingStatus(true);
            }
          },
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