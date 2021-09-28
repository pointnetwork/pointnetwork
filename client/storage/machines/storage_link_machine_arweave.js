const { Machine } = require('xstate');
const StorageLink = require('../../../db/models/storage_link');
const _ = require('lodash');

exports.createStateMachine = function createStateMachine(link, chunk) {
    let ctx = link.ctx;
    let storage = link.ctx.client.storage;

    async function prepareChunkData() {
        await link.refresh();
        if (!link.segments_sent) link.segments_sent = [];
        if (!link.segments_received) link.segments_received = [];

        const totalSegments = link.segment_hashes.length;
        let idx = -1;
        for(let i = 0; i < totalSegments; i++) {
            if (!link.segments_sent[i]) {
                idx = i; break;
            }
            // Retransmit timed out segments
            // todo: give up after X attempts to retransmit
            if (!storage.isProviderQueueFull(link.provider_id)) { // todo: shouldn't this condition be inside the next one, so that we're waiting for the provider to become freed up
                // sanity check
                if (storage.config.retransmit_segments_timeout_seconds < 1) throw Error('storage.config.retransmit_segments_timeout_seconds is configured at value: '+storage.config.retransmit_segments_timeout_seconds);

                if (!link.segments_received.includes(i) && link.segments_sent[i] && link.segments_sent[i] + storage.config.retransmit_segments_timeout_seconds < Math.floor(Date.now()/1000)) {
                    console.log('retransmitting chunk', link.chunk_id, 'segment', i);
                    idx = i;
                    break;
                }
            }
        }
        if (idx === -1) {
            return;
        }

        let segments_sent = [...link.segments_sent];
        segments_sent[idx] = Math.floor(Date.now()/1000);
        link.segments_sent = segments_sent;
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
                initialized: { // todo: no such status
                    on: {
                        CREATE: StorageLink.STATUS_CREATED,
                    },
                    exit: 'UPDATE_MODEL_STATUS'
                },
                [StorageLink.STATUS_CREATED]: {
                    invoke: {
                        id: 'SEND_STORE_CHUNK_REQUEST',
                        src: async (context, event) => {
                            await link.save();
                            ctx.client.deployerProgress.update(`chunk_${chunk.id}`, 0, link.state);
                            return true;
                            // return storage.SEND_STORE_CHUNK_REQUEST(chunk, link);
                        },
                        onDone: {
                            target: StorageLink.STATUS_SENDING_SEGMENT_MAP,
                        },
                        onError: {
                            actions: 'UPDATE_MODEL_ERR',
                            target: StorageLink.STATUS_FAILED,
                        }
                    },
                    exit: 'UPDATE_MODEL_STATUS'
                },
                [StorageLink.STATUS_SENDING_SEGMENT_MAP]: {
                    invoke: {
                        id: 'SEND_STORE_CHUNK_SEGMENTS',
                        src: async (context, event) => {
                            await link.save();
                            ctx.client.deployerProgress.update(`chunk_${chunk.id}`, 40, link.state);

                            return storage.SEND_STORE_CHUNK_SEGMENTS(link, chunk);
                        },
                        onDone: {
                            target: StorageLink.STATUS_SIGNED,
                        },
                        onError: [{
                            actions: 'UPDATE_MODEL_ERR',
                            target:  StorageLink.STATUS_ASKING_FOR_SIGNATURE,
                            cond: 'nodeAlreadyStoredData'
                        },{
                            actions: 'UPDATE_MODEL_ERR',
                            target: StorageLink.STATUS_FAILED,
                            cond: 'notNodeAlreadyStoredData'
                        }],
                    },
                    exit: 'UPDATE_MODEL_STATUS'
                },
                [StorageLink.STATUS_SIGNED]: {
                    invoke: {
                        id: 'SAVE_MODEL_SIGNED',
                        src: async () => {
                            await link.save();
                            ctx.client.deployerProgress.update(`chunk_${chunk.id}`, 100, link.state);
                            storage.uploadingChunksProcessing[chunk.id] = false;
                            return chunk.reconsiderUploadingStatus(true);
                        }
                    },
                    type: 'final'
                },
                [StorageLink.STATUS_FAILED]: {
                    invoke: {
                        id: 'SAVE_MODEL_FAILED',
                        src: async () => {
                            storage.uploadingChunksProcessing[chunk.id] = false;
                            return link.save();
                        }
                    },
                    type: 'final'
                },
            },
        },
        {
            actions: {
                UPDATE_MODEL_STATUS: async () => {
                    link.status = link.state;
                },
                UPDATE_MODEL_ERR: async (context, event) => { // todo: how is .errored different from .status = FAILED?
                    console.error({event, context});
                    console.error(`UPDATE_MODEL_ERR: ${event.data}`);
                    link.errored = true;
                    link.err = event.data;
                },
            },
            guards: {
                nodeAlreadyStoredData: (context, event) => {
                    _.startsWith(event.data, 'ECHUNKALREADYSTORED');
                },
                notNodeAlreadyStoredData: (context, event) => {
                    !_.startsWith(event.data, 'ECHUNKALREADYSTORED');
                }
            }
        }
    );
};