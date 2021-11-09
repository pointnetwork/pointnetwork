const { Machine } = require('xstate');
const StorageLink = require('../../../db/models/storage_link');
const File = require('../../../db/models/file');
const _ = require('lodash');

exports.createStateMachine = function createStateMachine(link, chunk) {
    const ctx = link.ctx;
    const log = ctx.log.child({module: 'StateMachineArweave', storageLink: link.id});
    const storage = link.ctx.client.storage;

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
                        onError: {
                            actions: 'UPDATE_MODEL_ERR',
                            target: StorageLink.STATUS_FAILED
                        },
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
                            await link.save();

                            // todo: let's fail the whole file too for now, but ideally shouldn't be done from here
                            const files = await File.getAllContainingChunkId(chunk.id);
                            for(let file of files) {
                                file.ul_status = File.UPLOADING_STATUS_FAILED;
                                await file.save();
                            }
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
                    log.error({event, context}, `UPDATE_MODEL_ERR: ${event.data}`);
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