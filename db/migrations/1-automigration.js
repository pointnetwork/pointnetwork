'use strict';

var Sequelize = require('sequelize');

/**
 * Actions summary:
 *
 * createTable "chunks", deps: []
 * createTable "files", deps: []
 * createTable "providers", deps: []
 * createTable "provider_chunks", deps: []
 * createTable "redkeys", deps: [providers]
 * createTable "storage_links", deps: [chunks, providers, redkeys]
 * createTable "file_maps", deps: [files, chunks]
 * addIndex "chunks_ul_status" to table "chunks"
 * addIndex "chunks_dl_status" to table "chunks"
 * addIndex "files_ul_status" to table "files"
 * addIndex "files_dl_status" to table "files"
 * addIndex "providers_address" to table "providers"
 * addIndex "provider_id_index_unique" to table "redkeys"
 * addIndex "storage_links_status" to table "storage_links"
 * addIndex "storage_links_chunk_id_status" to table "storage_links"
 * addIndex "storage_links_merkle_root" to table "storage_links"
 * addIndex "file_maps_chunk_id" to table "file_maps"
 * addIndex "file_maps_file_id" to table "file_maps"
 * addIndex "file_maps_file_id_chunk_id_offset" to table "file_maps"
 * addIndex "provider_chunks_status" to table "provider_chunks"
 * addIndex "provider_chunks_real_id" to table "provider_chunks"
 *
 **/

var info = {
    "revision": 1,
    "name": "automigration",
    "created": "2021-09-03T13:43:43.613Z",
    "comment": ""
};

var migrationCommands = function(transaction) {
    return [{
            fn: "createTable",
            params: [
                "chunks",
                {
                    "id": {
                        "type": Sequelize.STRING,
                        "field": "id",
                        "primaryKey": true,
                        "unique": true,
                        "allowNull": false
                    },
                    "size": {
                        "type": Sequelize.INTEGER,
                        "field": "size",
                        "allowNull": true
                    },
                    "ul_status": {
                        "type": Sequelize.STRING,
                        "field": "ul_status",
                        "defaultValue": "us0",
                        "allowNull": false
                    },
                    "dl_status": {
                        "type": Sequelize.STRING,
                        "field": "dl_status",
                        "defaultValue": "ds0",
                        "allowNull": false
                    },
                    "redundancy": {
                        "type": Sequelize.INTEGER,
                        "field": "redundancy",
                        "allowNull": true
                    },
                    "expires": {
                        "type": Sequelize.BIGINT,
                        "field": "expires",
                        "allowNull": true
                    },
                    "autorenew": {
                        "type": Sequelize.BOOLEAN,
                        "field": "autorenew",
                        "allowNull": true
                    },
                    "created_at": {
                        "type": Sequelize.DATE,
                        "field": "created_at",
                        "allowNull": false
                    },
                    "updated_at": {
                        "type": Sequelize.DATE,
                        "field": "updated_at",
                        "allowNull": false
                    }
                },
                {
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "createTable",
            params: [
                "files",
                {
                    "id": {
                        "type": Sequelize.STRING,
                        "field": "id",
                        "primaryKey": true,
                        "unique": true,
                        "allowNull": false
                    },
                    "original_path": {
                        "type": Sequelize.TEXT,
                        "field": "original_path",
                        "allowNull": false
                    },
                    "size": {
                        "type": Sequelize.INTEGER,
                        "field": "size",
                        "allowNull": true
                    },
                    "chunkIds": {
                        "type": Sequelize.JSON,
                        "field": "chunk_ids",
                        "allowNull": true
                    },
                    "ul_status": {
                        "type": Sequelize.STRING,
                        "field": "ul_status",
                        "defaultValue": "us0",
                        "allowNull": false
                    },
                    "dl_status": {
                        "type": Sequelize.STRING,
                        "field": "dl_status",
                        "defaultValue": "ds0",
                        "allowNull": false
                    },
                    "redundancy": {
                        "type": Sequelize.INTEGER,
                        "field": "redundancy",
                        "allowNull": true
                    },
                    "expires": {
                        "type": Sequelize.BIGINT,
                        "field": "expires",
                        "allowNull": true
                    },
                    "autorenew": {
                        "type": Sequelize.BOOLEAN,
                        "field": "autorenew",
                        "allowNull": true
                    },
                    "created_at": {
                        "type": Sequelize.DATE,
                        "field": "created_at",
                        "allowNull": false
                    },
                    "updated_at": {
                        "type": Sequelize.DATE,
                        "field": "updated_at",
                        "allowNull": false
                    }
                },
                {
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "createTable",
            params: [
                "providers",
                {
                    "id": {
                        "type": Sequelize.STRING,
                        "field": "id",
                        "primaryKey": true,
                        "unique": true,
                        "allowNull": false
                    },
                    "connection": {
                        "type": Sequelize.STRING,
                        "field": "connection",
                        "allowNull": false
                    },
                    "address": {
                        "type": Sequelize.STRING,
                        "field": "address",
                        "allowNull": false
                    },
                    "created_at": {
                        "type": Sequelize.DATE,
                        "field": "created_at",
                        "allowNull": false
                    },
                    "updated_at": {
                        "type": Sequelize.DATE,
                        "field": "updated_at",
                        "allowNull": false
                    }
                },
                {
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "createTable",
            params: [
                "provider_chunks",
                {
                    "id": {
                        "type": Sequelize.STRING,
                        "field": "id",
                        "primaryKey": true,
                        "unique": true,
                        "allowNull": false
                    },
                    "size": {
                        "type": Sequelize.INTEGER,
                        "field": "size",
                        "allowNull": true
                    },
                    "real_id": {
                        "type": Sequelize.STRING,
                        "field": "real_id",
                        "allowNull": true
                    },
                    "real_id_verified": {
                        "type": Sequelize.BOOLEAN,
                        "field": "real_id_verified",
                        "allowNull": true
                    },
                    "real_size": {
                        "type": Sequelize.INTEGER,
                        "field": "real_size",
                        "allowNull": true
                    },
                    "status": {
                        "type": Sequelize.STRING,
                        "field": "status",
                        "defaultValue": "s0",
                        "allowNull": false
                    },
                    "public_key": {
                        "type": Sequelize.TEXT,
                        "field": "public_key",
                        "allowNull": true
                    },
                    "segment_hashes": {
                        "type": Sequelize.JSON,
                        "field": "segment_hashes",
                        "allowNull": true
                    },
                    "created_at": {
                        "type": Sequelize.DATE,
                        "field": "created_at",
                        "allowNull": false
                    },
                    "updated_at": {
                        "type": Sequelize.DATE,
                        "field": "updated_at",
                        "allowNull": false
                    }
                },
                {
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "createTable",
            params: [
                "redkeys",
                {
                    "id": {
                        "type": Sequelize.BIGINT,
                        "field": "id",
                        "autoIncrement": true,
                        "primaryKey": true,
                        "unique": true,
                        "allowNull": false
                    },
                    "index": {
                        "type": Sequelize.INTEGER,
                        "field": "index",
                        "allowNull": false
                    },
                    "private_key": {
                        "type": Sequelize.TEXT,
                        "field": "private_key",
                        "allowNull": false
                    },
                    "public_key": {
                        "type": Sequelize.TEXT,
                        "field": "public_key",
                        "allowNull": false
                    },
                    "created_at": {
                        "type": Sequelize.DATE,
                        "field": "created_at",
                        "allowNull": false
                    },
                    "updated_at": {
                        "type": Sequelize.DATE,
                        "field": "updated_at",
                        "allowNull": false
                    },
                    "provider_id": {
                        "type": Sequelize.STRING,
                        "field": "provider_id",
                        "onUpdate": "CASCADE",
                        "onDelete": "SET NULL",
                        "references": {
                            "model": "providers",
                            "key": "id"
                        },
                        "allowNull": true
                    }
                },
                {
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "createTable",
            params: [
                "storage_links",
                {
                    "id": {
                        "type": Sequelize.BIGINT,
                        "field": "id",
                        "autoIncrement": true,
                        "primaryKey": true,
                        "unique": true,
                        "allowNull": false
                    },
                    "status": {
                        "type": Sequelize.STRING,
                        "field": "status",
                        "allowNull": false
                    },
                    "encrypted_length": {
                        "type": Sequelize.INTEGER,
                        "field": "encrypted_length",
                        "allowNull": true
                    },
                    "segments_sent": {
                        "type": Sequelize.JSON,
                        "field": "segments_sent",
                        "allowNull": true
                    },
                    "segments_received": {
                        "type": Sequelize.JSON,
                        "field": "segments_received",
                        "allowNull": true
                    },
                    "segment_hashes": {
                        "type": Sequelize.JSON,
                        "field": "segment_hashes",
                        "allowNull": true
                    },
                    "merkle_tree": {
                        "type": Sequelize.JSON,
                        "field": "merkle_tree",
                        "allowNull": true
                    },
                    "merkle_root": {
                        "type": Sequelize.STRING,
                        "field": "merkle_root",
                        "allowNull": true
                    },
                    "created_at": {
                        "type": Sequelize.DATE,
                        "field": "created_at",
                        "allowNull": false
                    },
                    "updated_at": {
                        "type": Sequelize.DATE,
                        "field": "updated_at",
                        "allowNull": false
                    },
                    "chunk_id": {
                        "type": Sequelize.STRING,
                        "field": "chunk_id",
                        "onUpdate": "CASCADE",
                        "onDelete": "SET NULL",
                        "references": {
                            "model": "chunks",
                            "key": "id"
                        },
                        "allowNull": true
                    },
                    "provider_id": {
                        "type": Sequelize.STRING,
                        "field": "provider_id",
                        "onUpdate": "CASCADE",
                        "onDelete": "SET NULL",
                        "references": {
                            "model": "providers",
                            "key": "id"
                        },
                        "allowNull": true
                    },
                    "redkey_id": {
                        "type": Sequelize.BIGINT,
                        "field": "redkey_id",
                        "onUpdate": "CASCADE",
                        "onDelete": "SET NULL",
                        "references": {
                            "model": "redkeys",
                            "key": "id"
                        },
                        "allowNull": true
                    }
                },
                {
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "createTable",
            params: [
                "file_maps",
                {
                    "id": {
                        "type": Sequelize.BIGINT,
                        "field": "id",
                        "autoIncrement": true,
                        "primaryKey": true,
                        "unique": true,
                        "allowNull": false
                    },
                    "offset": {
                        "type": Sequelize.INTEGER,
                        "field": "offset",
                        "allowNull": false
                    },
                    "created_at": {
                        "type": Sequelize.DATE,
                        "field": "created_at",
                        "allowNull": false
                    },
                    "updated_at": {
                        "type": Sequelize.DATE,
                        "field": "updated_at",
                        "allowNull": false
                    },
                    "file_id": {
                        "type": Sequelize.STRING,
                        "field": "file_id",
                        "onUpdate": "CASCADE",
                        "onDelete": "SET NULL",
                        "references": {
                            "model": "files",
                            "key": "id"
                        },
                        "allowNull": true
                    },
                    "chunk_id": {
                        "type": Sequelize.STRING,
                        "field": "chunk_id",
                        "onUpdate": "CASCADE",
                        "onDelete": "SET NULL",
                        "references": {
                            "model": "chunks",
                            "key": "id"
                        },
                        "allowNull": true
                    }
                },
                {
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "chunks",
                ["ul_status"],
                {
                    "indexName": "chunks_ul_status",
                    "name": "chunks_ul_status",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "chunks",
                ["dl_status"],
                {
                    "indexName": "chunks_dl_status",
                    "name": "chunks_dl_status",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "files",
                ["ul_status"],
                {
                    "indexName": "files_ul_status",
                    "name": "files_ul_status",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "files",
                ["dl_status"],
                {
                    "indexName": "files_dl_status",
                    "name": "files_dl_status",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "providers",
                ["address"],
                {
                    "indexName": "providers_address",
                    "name": "providers_address",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "redkeys",
                ["provider_id", "index"],
                {
                    "indexName": "provider_id_index_unique",
                    "name": "provider_id_index_unique",
                    "indicesType": "UNIQUE",
                    "type": "UNIQUE",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "storage_links",
                ["status"],
                {
                    "indexName": "storage_links_status",
                    "name": "storage_links_status",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "storage_links",
                ["chunk_id", "status"],
                {
                    "indexName": "storage_links_chunk_id_status",
                    "name": "storage_links_chunk_id_status",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "storage_links",
                ["merkle_root"],
                {
                    "indexName": "storage_links_merkle_root",
                    "name": "storage_links_merkle_root",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "file_maps",
                ["chunk_id"],
                {
                    "indexName": "file_maps_chunk_id",
                    "name": "file_maps_chunk_id",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "file_maps",
                ["file_id"],
                {
                    "indexName": "file_maps_file_id",
                    "name": "file_maps_file_id",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "file_maps",
                ["file_id", "chunk_id", "offset"],
                {
                    "indexName": "file_maps_file_id_chunk_id_offset",
                    "name": "file_maps_file_id_chunk_id_offset",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "provider_chunks",
                ["status"],
                {
                    "indexName": "provider_chunks_status",
                    "name": "provider_chunks_status",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "provider_chunks",
                ["real_id"],
                {
                    "indexName": "provider_chunks_real_id",
                    "name": "provider_chunks_real_id",
                    "transaction": transaction
                }
            ]
        }
    ];
};
var rollbackCommands = function(transaction) {
    return [{
            fn: "dropTable",
            params: ["chunks", {
                transaction: transaction
            }]
        },
        {
            fn: "dropTable",
            params: ["files", {
                transaction: transaction
            }]
        },
        {
            fn: "dropTable",
            params: ["providers", {
                transaction: transaction
            }]
        },
        {
            fn: "dropTable",
            params: ["redkeys", {
                transaction: transaction
            }]
        },
        {
            fn: "dropTable",
            params: ["storage_links", {
                transaction: transaction
            }]
        },
        {
            fn: "dropTable",
            params: ["file_maps", {
                transaction: transaction
            }]
        },
        {
            fn: "dropTable",
            params: ["provider_chunks", {
                transaction: transaction
            }]
        }
    ];
};

module.exports = {
    pos: 0,
    useTransaction: true,
    execute: function(queryInterface, Sequelize, _commands)
    {
        var index = this.pos;
        function run(transaction) {
            const commands = _commands(transaction);
            return new Promise(function(resolve, reject) {
                function next() {
                    if (index < commands.length)
                    {
                        let command = commands[index];
                        // console.log("[#"+index+"] execute: " + command.fn);
                        index++;
                        queryInterface[command.fn].apply(queryInterface, command.params).then(next, reject);
                    }
                    else
                        resolve();
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
    up: function(queryInterface, Sequelize)
    {
        return this.execute(queryInterface, Sequelize, migrationCommands);
    },
    down: function(queryInterface, Sequelize)
    {
        return this.execute(queryInterface, Sequelize, rollbackCommands);
    },
    info: info
};
