const { Machine } = require('xstate');

exports.createStateMachine = function createStateMachine(link, chunk, storage) {
  async function prepareChunkSegment() {
    await link.refresh()
    const key = await link.getRedkey();
    return [
      link.merkle_root,
      link.segment_hashes.map(x=>Buffer.from(x, 'hex')),
      link.encrypted_length,
      chunk.id,
      key.pub,
      chunk.length,
    ];
  }

  async function prepareChunkData() {
    if (!link.segments_sent) link.segments_sent = {};
    if (!link.segments_received) link.segments_received = [];

    const totalSegments = link.segment_hashes.length;
    let idx = -1;
    for(let i = 0; i < totalSegments; i++) {
        if (!link.segments_sent[i]) {
            idx = i; break;
        }
        // Retransmit timed out segments
        // todo: give up after X attempts to retransmit
        if (!storage.isProviderQueueFull(link.provider_id)) {
            if (!link.segments_received.includes(i) && link.segments_sent[i] && link.segments_sent[i] + storage.config.retransmit_segments_timeout_seconds < Math.floor(Date.now()/1000)) {
                console.log('retransmitting chunk', link.chunk_id, 'segment', i);
                idx = i;
                break
            }
        }
    }
    if (idx === -1) {
        return
    }

    link.segments_sent[idx] = Math.floor(Date.now()/1000);
    await link.save();

    const encryptedData = link.getEncryptedData(); // todo: optimize using fs ranges // todo: use fs async

    const SEGMENT_SIZE_BYTES = storage.ctx.config.storage.segment_size_bytes;

    return [
        link.merkle_root,
        idx,
        // Note: Buffer.slice is (start, end) not (start, length)
        encryptedData.slice(idx * SEGMENT_SIZE_BYTES, idx * SEGMENT_SIZE_BYTES + SEGMENT_SIZE_BYTES),
    ];
  }

  return Machine(
    {
      id: 'storageLink',
      initial: 'initialized',
      states: {
        initialized: {
          on: {
            CREATE: 'created',
          },
          exit: 'UPDATE_MODEL_STATUS'
        },
        created: {
          invoke: {
            id: 'SEND_STORE_CHUNK_REQUEST',
            src: async (context, event) => {
              await link.save()
              return storage.SEND_STORE_CHUNK_REQUEST(chunk, link)
            },
            onDone: {
              target: 'creating_payment_channel',
            },
            onError: {
              actions: 'UPDATE_MODEL_ERR',
              target: 'failed',
            }
          },
          exit: 'UPDATE_MODEL_STATUS'
        },
        creating_payment_channel: {
          invoke: {
            id: 'SEND_CREATE_PAYMENT_CHANNEL',
            src: async (context, event) => {
              await link.save()
              return storage.CREATE_PAYMENT_CHANNEL(link)
            },
            onDone: {
              target: 'encrypting',
            },
            onError: {
              actions: 'UPDATE_MODEL_ERR',
              target: 'failed',
            }
          },
          exit: 'UPDATE_MODEL_STATUS'
        },
        encrypting: {
          invoke: {
            id: 'ENCRYPT_CHUNK',
            src: async (context, event) => {
              await link.save()
              return storage.ENCRYPT_CHUNK(chunk, link)
            },
            onDone: {
              target: 'sending_segment_map'
            },
            onError: {
              target: 'failed'
            }
          },
          exit: 'UPDATE_MODEL_STATUS'
        },
        sending_segment_map: {
          invoke: {
            id: 'SEND_STORE_CHUNK_SEGMENTS',
            src: async (context, event) => {
              await link.save()
              const data = await prepareChunkSegment()
              return storage.SEND_STORE_CHUNK_SEGMENTS(data, link)
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
          exit: 'UPDATE_MODEL_STATUS'
        },
        sending_data: {
          invoke: {
            id: 'SEND_STORE_CHUNK_DATA',
            src: async (context, event) => {
              // nasty hack to ensure all chunks are uploaded
              await link.save()
              done = false
              while(!done) {
                await link.refresh()
                data = await prepareChunkData()
                done = await storage.SEND_STORE_CHUNK_DATA(data, link)
                await link.save()
              }
              Promise.resolve(true)
            },
            onDone: {
              target: 'asking_for_signature',
            },
            onError: {
              actions: 'UPDATE_MODEL_ERR',
              target: 'failed',
            },
          },
          exit: 'UPDATE_MODEL_STATUS'
        },
        asking_for_signature: {
          invoke: {
            id: 'SEND_STORE_CHUNK_SIGNATURE_REQUEST',
            src: async (context, event) => {
              await link.save()
              return storage.SEND_STORE_CHUNK_SIGNATURE_REQUEST(link)
            },
            onDone: {
              target: 'signed',
            },
            onError: {
              actions: 'UPDATE_MODEL_ERR',
              target: 'failed',
            },
          },
          exit: 'UPDATE_MODEL_STATUS'
        },
        signed: {
          invoke: {
            id: 'SAVE_MODEL_SIGNED',
            src: async () => {
              await link.save()
              storage.uploadingChunksProcessing[chunk.id] = false;
              return chunk.reconsiderUploadingStatus(true);
            }
          },
          type: 'final'
        },
        failed: {
          invoke: {
            id: 'SAVE_MODEL_FAILED',
            src: async () => {
              storage.uploadingChunksProcessing[chunk.id] = false;
              return link.save()
            }
          },
          type: 'final'
        },
      },
    },
    {
      actions: {
        UPDATE_MODEL_STATUS: async () => {
          link.status = link.state
        },
        UPDATE_MODEL_ERR: async (context, event) => {
          console.error(`UPDATE_MODEL_ERR: ${event.data}`)
          link.errored = true
          link.err = event.data
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