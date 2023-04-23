'use strict';

var Sequelize = require('sequelize');

/**
 * Actions summary:
 *
 * createTable "dir_maps", deps: []
 * createTable "files", deps: []
 * createTable "chunks", deps: []
 * createTable "events", deps: []
 * createTable "event_scans", deps: []
 * createTable "file_maps", deps: [chunks, files]
 * addIndex "dir_maps_file_id" to table "dir_maps"
 * addIndex "dir_maps_dir_id" to table "dir_maps"
 * addIndex "dir_maps_dir_id_file_id" to table "dir_maps"
 * addIndex "dir_maps_dir_id_offset" to table "dir_maps"
 * addIndex "dir_maps_dir_id_file_id_offset" to table "dir_maps"
 * addIndex "files_ul_status" to table "files"
 * addIndex "files_dl_status" to table "files"
 * addIndex "files_dir_ul_status" to table "files"
 * addIndex "chunks_ul_status" to table "chunks"
 * addIndex "chunks_dl_status" to table "chunks"
 * addIndex "file_maps_chunk_id" to table "file_maps"
 * addIndex "file_maps_file_id" to table "file_maps"
 * addIndex "file_maps_file_id_chunk_id" to table "file_maps"
 * addIndex "file_maps_file_id_offset" to table "file_maps"
 * addIndex "file_maps_file_id_chunk_id_offset" to table "file_maps"
 * addIndex "events_chain_id" to table "events"
 * addIndex "events_chain_id_block_number" to table "events"
 * addIndex "events_chain_id_log_index" to table "events"
 * addIndex "events_chain_id_contract_address_event" to table "events"
 * addIndex "events_chain_id_contract_address_event_log_index" to table "events"
 * addIndex "events_chain_id_contract_address_block_number" to table "events"
 * addIndex "events_chain_id_contract_address_event_block_number" to table "events"
 * addIndex "events_topic0" to table "events"
 * addIndex "events_topic1" to table "events"
 * addIndex "events_topic2" to table "events"
 * addIndex "events_chain_id_raw_id" to table "events"
 * addIndex "event_scans_chain_id" to table "event_scans"
 * addIndex "event_scans_chain_id_from_block" to table "event_scans"
 * addIndex "event_scans_chain_id_to_block" to table "event_scans"
 * addIndex "event_scans_chain_id_contract_address_from_block" to table "event_scans"
 * addIndex "event_scans_chain_id_contract_address_to_block" to table "event_scans"
 *
 **/

var info = {
    revision: 1,
    name: 'automigration',
    created: '2023-01-29T15:10:36.827Z',
    comment: ''
};

var migrationCommands = function(transaction) {
    return [{
        fn: 'createTable',
        params: [
            'dir_maps',
            {
                id: {
                    type: Sequelize.BIGINT,
                    field: 'id',
                    primaryKey: true,
                    unique: true,
                    autoIncrement: true,
                    allowNull: false
                },
                dir_id: {
                    type: Sequelize.STRING,
                    field: 'dir_id',
                    allowNull: false
                },
                file_id: {
                    type: Sequelize.STRING,
                    field: 'file_id',
                    allowNull: false
                },
                offset: {
                    type: Sequelize.BIGINT,
                    field: 'offset',
                    allowNull: false
                },
                dir_size: {
                    type: Sequelize.BIGINT,
                    field: 'dir_size',
                    allowNull: false
                },
                is_dir: {
                    type: Sequelize.BOOLEAN,
                    field: 'is_dir',
                    allowNull: false
                },
                created_at: {
                    type: Sequelize.DATE,
                    field: 'created_at',
                    allowNull: false
                },
                updated_at: {
                    type: Sequelize.DATE,
                    field: 'updated_at',
                    allowNull: false
                }
            },
            {transaction: transaction}
        ]
    },
    {
        fn: 'createTable',
        params: [
            'files',
            {
                id: {
                    type: Sequelize.STRING,
                    field: 'id',
                    primaryKey: true,
                    unique: true,
                    allowNull: false
                },
                size: {
                    type: Sequelize.BIGINT,
                    field: 'size',
                    allowNull: true
                },
                chunk_ids: {
                    type: Sequelize.JSON,
                    field: 'chunk_ids',
                    allowNull: true
                },
                dl_status: {
                    type: Sequelize.STRING,
                    field: 'dl_status',
                    defaultValue: 'NOT_STARTED',
                    allowNull: false
                },
                ul_status: {
                    type: Sequelize.STRING,
                    field: 'ul_status',
                    defaultValue: 'NOT_STARTED',
                    allowNull: false
                },
                dl_progress: {
                    type: Sequelize.FLOAT,
                    field: 'dl_progress',
                    defaultValue: 0,
                    allowNull: false
                },
                ul_progress: {
                    type: Sequelize.FLOAT,
                    field: 'ul_progress',
                    defaultValue: 0,
                    allowNull: false
                },
                expires: {
                    type: Sequelize.BIGINT,
                    field: 'expires',
                    allowNull: true
                },
                dir_size: {
                    type: Sequelize.BIGINT,
                    field: 'dir_size',
                    allowNull: true
                },
                dir_ul_progress: {
                    type: Sequelize.FLOAT,
                    field: 'dir_ul_progress',
                    defaultValue: 0,
                    allowNull: false
                },
                dir_ul_status: {
                    type: Sequelize.STRING,
                    field: 'dir_ul_status',
                    defaultValue: 'NOT_STARTED',
                    allowNull: false
                },
                created_at: {
                    type: Sequelize.DATE,
                    field: 'created_at',
                    allowNull: false
                },
                updated_at: {
                    type: Sequelize.DATE,
                    field: 'updated_at',
                    allowNull: false
                }
            },
            {transaction: transaction}
        ]
    },
    {
        fn: 'createTable',
        params: [
            'chunks',
            {
                id: {
                    type: Sequelize.STRING,
                    field: 'id',
                    primaryKey: true,
                    unique: true,
                    allowNull: false
                },
                size: {
                    type: Sequelize.INTEGER,
                    field: 'size',
                    allowNull: true
                },
                dl_status: {
                    type: Sequelize.STRING,
                    field: 'dl_status',
                    defaultValue: 'NOT_STARTED',
                    allowNull: false
                },
                ul_status: {
                    type: Sequelize.STRING,
                    field: 'ul_status',
                    defaultValue: 'NOT_STARTED',
                    allowNull: false
                },
                retry_count: {
                    type: Sequelize.INTEGER,
                    field: 'retry_count',
                    defaultValue: 0,
                    allowNull: false
                },
                validation_retry_count: {
                    type: Sequelize.INTEGER,
                    field: 'validation_retry_count',
                    defaultValue: 0,
                    allowNull: false
                },
                txid: {
                    type: Sequelize.STRING,
                    field: 'txid',
                    allowNull: true
                },
                expires: {
                    type: Sequelize.BIGINT,
                    field: 'expires',
                    allowNull: true
                },
                created_at: {
                    type: Sequelize.DATE,
                    field: 'created_at',
                    allowNull: false
                },
                updated_at: {
                    type: Sequelize.DATE,
                    field: 'updated_at',
                    allowNull: false
                }
            },
            {transaction: transaction}
        ]
    },
    {
        fn: 'createTable',
        params: [
            'events',
            {
                id: {
                    type: Sequelize.STRING,
                    field: 'id',
                    primaryKey: true,
                    unique: true,
                    allowNull: false
                },
                raw_id: {
                    type: Sequelize.STRING,
                    field: 'raw_id',
                    allowNull: true
                },
                chain_id: {
                    type: Sequelize.INTEGER,
                    field: 'chain_id',
                    allowNull: false
                },
                contract_address: {
                    type: Sequelize.STRING,
                    field: 'contract_address',
                    allowNull: false
                },
                block_number: {
                    type: Sequelize.INTEGER,
                    field: 'block_number',
                    allowNull: false
                },
                transaction_hash: {
                    type: Sequelize.STRING,
                    field: 'transaction_hash',
                    allowNull: false
                },
                transaction_index: {
                    type: Sequelize.INTEGER,
                    field: 'transaction_index',
                    allowNull: false
                },
                block_hash: {
                    type: Sequelize.STRING,
                    field: 'block_hash',
                    allowNull: false
                },
                log_index: {
                    type: Sequelize.INTEGER,
                    field: 'log_index',
                    allowNull: false
                },
                removed: {
                    type: Sequelize.BOOLEAN,
                    field: 'removed',
                    allowNull: false
                },
                return_values: {
                    type: Sequelize.JSON,
                    field: 'return_values',
                    allowNull: true
                },
                event: {
                    type: Sequelize.STRING,
                    field: 'event',
                    allowNull: true
                },
                signature: {
                    type: Sequelize.STRING,
                    field: 'signature',
                    allowNull: true
                },
                raw: {
                    type: Sequelize.JSON,
                    field: 'raw',
                    allowNull: true
                },
                topic0: {
                    type: Sequelize.STRING,
                    field: 'topic0',
                    allowNull: true
                },
                topic1: {
                    type: Sequelize.STRING,
                    field: 'topic1',
                    allowNull: true
                },
                topic2: {
                    type: Sequelize.STRING,
                    field: 'topic2',
                    allowNull: true
                },
                created_at: {
                    type: Sequelize.DATE,
                    field: 'created_at',
                    allowNull: false
                },
                updated_at: {
                    type: Sequelize.DATE,
                    field: 'updated_at',
                    allowNull: false
                }
            },
            {transaction: transaction}
        ]
    },
    {
        fn: 'createTable',
        params: [
            'event_scans',
            {
                id: {
                    type: Sequelize.STRING,
                    field: 'id',
                    primaryKey: true,
                    unique: true,
                    allowNull: false
                },
                chain_id: {
                    type: Sequelize.INTEGER,
                    field: 'chain_id',
                    unique: false,
                    allowNull: false
                },
                contract_address: {
                    type: Sequelize.STRING,
                    field: 'contract_address',
                    allowNull: false
                },
                from_block: {
                    type: Sequelize.INTEGER,
                    field: 'from_block',
                    allowNull: false
                },
                to_block: {
                    type: Sequelize.INTEGER,
                    field: 'to_block',
                    allowNull: false
                },
                created_at: {
                    type: Sequelize.DATE,
                    field: 'created_at',
                    allowNull: false
                },
                updated_at: {
                    type: Sequelize.DATE,
                    field: 'updated_at',
                    allowNull: false
                }
            },
            {transaction: transaction}
        ]
    },
    {
        fn: 'createTable',
        params: [
            'file_maps',
            {
                id: {
                    type: Sequelize.BIGINT,
                    field: 'id',
                    primaryKey: true,
                    unique: true,
                    autoIncrement: true,
                    allowNull: false
                },
                file_id: {
                    type: Sequelize.STRING,
                    field: 'file_id',
                    allowNull: false
                },
                chunk_id: {
                    type: Sequelize.STRING,
                    field: 'chunk_id',
                    allowNull: false
                },
                offset: {
                    type: Sequelize.BIGINT,
                    field: 'offset',
                    allowNull: false
                },
                created_at: {
                    type: Sequelize.DATE,
                    field: 'created_at',
                    allowNull: false
                },
                updated_at: {
                    type: Sequelize.DATE,
                    field: 'updated_at',
                    allowNull: false
                },
                ChunkId: {
                    type: Sequelize.STRING,
                    field: 'chunk_id',
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL',
                    references: {
                        model: 'chunks',
                        key: 'id'
                    },
                    allowNull: true
                },
                FileId: {
                    type: Sequelize.STRING,
                    field: 'file_id',
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL',
                    references: {
                        model: 'files',
                        key: 'id'
                    },
                    allowNull: true
                }
            },
            {transaction: transaction}
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'dir_maps',
            ['file_id'],
            {
                indexName: 'dir_maps_file_id',
                name: 'dir_maps_file_id',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'dir_maps',
            ['dir_id'],
            {
                indexName: 'dir_maps_dir_id',
                name: 'dir_maps_dir_id',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'dir_maps',
            ['dir_id', 'file_id'],
            {
                indexName: 'dir_maps_dir_id_file_id',
                name: 'dir_maps_dir_id_file_id',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'dir_maps',
            ['dir_id', 'offset'],
            {
                indexName: 'dir_maps_dir_id_offset',
                name: 'dir_maps_dir_id_offset',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'dir_maps',
            ['dir_id', 'file_id', 'offset'],
            {
                indexName: 'dir_maps_dir_id_file_id_offset',
                name: 'dir_maps_dir_id_file_id_offset',
                indicesType: 'UNIQUE',
                type: 'UNIQUE',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'files',
            ['ul_status'],
            {
                indexName: 'files_ul_status',
                name: 'files_ul_status',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'files',
            ['dl_status'],
            {
                indexName: 'files_dl_status',
                name: 'files_dl_status',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'files',
            ['dir_ul_status'],
            {
                indexName: 'files_dir_ul_status',
                name: 'files_dir_ul_status',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'chunks',
            ['ul_status'],
            {
                indexName: 'chunks_ul_status',
                name: 'chunks_ul_status',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'chunks',
            ['dl_status'],
            {
                indexName: 'chunks_dl_status',
                name: 'chunks_dl_status',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'file_maps',
            ['chunk_id'],
            {
                indexName: 'file_maps_chunk_id',
                name: 'file_maps_chunk_id',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'file_maps',
            ['file_id'],
            {
                indexName: 'file_maps_file_id',
                name: 'file_maps_file_id',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'file_maps',
            ['file_id', 'chunk_id'],
            {
                indexName: 'file_maps_file_id_chunk_id',
                name: 'file_maps_file_id_chunk_id',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'file_maps',
            ['file_id', 'offset'],
            {
                indexName: 'file_maps_file_id_offset',
                name: 'file_maps_file_id_offset',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'file_maps',
            ['file_id', 'chunk_id', 'offset'],
            {
                indexName: 'file_maps_file_id_chunk_id_offset',
                name: 'file_maps_file_id_chunk_id_offset',
                indicesType: 'UNIQUE',
                type: 'UNIQUE',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'events',
            ['chain_id'],
            {
                indexName: 'events_chain_id',
                name: 'events_chain_id',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'events',
            ['chain_id', 'block_number'],
            {
                indexName: 'events_chain_id_block_number',
                name: 'events_chain_id_block_number',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'events',
            ['chain_id', 'log_index'],
            {
                indexName: 'events_chain_id_log_index',
                name: 'events_chain_id_log_index',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'events',
            ['chain_id', 'contract_address', 'event'],
            {
                indexName: 'events_chain_id_contract_address_event',
                name: 'events_chain_id_contract_address_event',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'events',
            ['chain_id', 'contract_address', 'event', 'log_index'],
            {
                indexName: 'events_chain_id_contract_address_event_log_index',
                name: 'events_chain_id_contract_address_event_log_index',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'events',
            ['chain_id', 'contract_address', 'block_number'],
            {
                indexName: 'events_chain_id_contract_address_block_number',
                name: 'events_chain_id_contract_address_block_number',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'events',
            ['chain_id', 'contract_address', 'event', 'block_number'],
            {
                indexName: 'events_chain_id_contract_address_event_block_number',
                name: 'events_chain_id_contract_address_event_block_number',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'events',
            ['topic0'],
            {
                indexName: 'events_topic0',
                name: 'events_topic0',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'events',
            ['topic1'],
            {
                indexName: 'events_topic1',
                name: 'events_topic1',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'events',
            ['topic2'],
            {
                indexName: 'events_topic2',
                name: 'events_topic2',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'events',
            ['chain_id', 'raw_id'],
            {
                indexName: 'events_chain_id_raw_id',
                name: 'events_chain_id_raw_id',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'event_scans',
            ['chain_id'],
            {
                indexName: 'event_scans_chain_id',
                name: 'event_scans_chain_id',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'event_scans',
            ['chain_id', 'from_block'],
            {
                indexName: 'event_scans_chain_id_from_block',
                name: 'event_scans_chain_id_from_block',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'event_scans',
            ['chain_id', 'to_block'],
            {
                indexName: 'event_scans_chain_id_to_block',
                name: 'event_scans_chain_id_to_block',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'event_scans',
            ['chain_id', 'contract_address', 'from_block'],
            {
                indexName: 'event_scans_chain_id_contract_address_from_block',
                name: 'event_scans_chain_id_contract_address_from_block',
                transaction: transaction
            }
        ]
    },
    {
        fn: 'addIndex',
        params: [
            'event_scans',
            ['chain_id', 'contract_address', 'to_block'],
            {
                indexName: 'event_scans_chain_id_contract_address_to_block',
                name: 'event_scans_chain_id_contract_address_to_block',
                transaction: transaction
            }
        ]
    }
    ];
};
var rollbackCommands = function(transaction) {
    return [{
        fn: 'dropTable',
        params: ['dir_maps', {transaction: transaction}]
    },
    {
        fn: 'dropTable',
        params: ['files', {transaction: transaction}]
    },
    {
        fn: 'dropTable',
        params: ['chunks', {transaction: transaction}]
    },
    {
        fn: 'dropTable',
        params: ['file_maps', {transaction: transaction}]
    },
    {
        fn: 'dropTable',
        params: ['events', {transaction: transaction}]
    },
    {
        fn: 'dropTable',
        params: ['event_scans', {transaction: transaction}]
    }
    ];
};

module.exports = {
    pos: 0,
    useTransaction: true,
    execute: function(queryInterface, Sequelize, _commands) {
        var index = this.pos;
        function run(transaction) {
            const commands = _commands(transaction);
            return new Promise(function(resolve, reject) {
                function next() {
                    if (index < commands.length) {
                        const command = commands[index];
                        // eslint-disable-next-line no-console
                        console.log('[#' + index + '] execute: ' + command.fn);
                        index++;
                        queryInterface[command.fn].apply(queryInterface, command.params).then(next, reject);
                    } else {resolve();}
                }
                next();
            });
        }
        if (this.useTransaction) {
            return queryInterface.sequelize.transaction(run);
        } else {
            return run(null);
        }
    },
    up: function(queryInterface, Sequelize) {
        return this.execute(queryInterface, Sequelize, migrationCommands);
    },
    down: function(queryInterface, Sequelize) {
        return this.execute(queryInterface, Sequelize, rollbackCommands);
    },
    info: info
};
