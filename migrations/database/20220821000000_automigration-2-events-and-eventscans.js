'use strict';

var Sequelize = require('sequelize');

/**
 * Actions summary:
 *
 * createTable "events", deps: []
 * createTable "event_scans", deps: []
 * addIndex "events_chain_id_raw_id" to table "events"
 * addIndex "events_topic2" to table "events"
 * addIndex "events_topic1" to table "events"
 * addIndex "events_topic0" to table "events"
 * addIndex "events_chain_id_contract_address_event_block_number" to table "events"
 * addIndex "events_chain_id_contract_address_block_number" to table "events"
 * addIndex "events_chain_id_contract_address_event_log_index" to table "events"
 * addIndex "events_chain_id_contract_address_event" to table "events"
 * addIndex "events_chain_id_log_index" to table "events"
 * addIndex "events_chain_id_block_number" to table "events"
 * addIndex "events_chain_id" to table "events"
 * addIndex "event_scans_chain_id_contract_address_to_block" to table "event_scans"
 * addIndex "event_scans_chain_id_contract_address_from_block" to table "event_scans"
 * addIndex "event_scans_chain_id_to_block" to table "event_scans"
 * addIndex "event_scans_chain_id_from_block" to table "event_scans"
 * addIndex "event_scans_chain_id" to table "event_scans"
 *
 **/

var info = {
    "revision": 6,
    "name": "automigration",
    "created": "2022-08-21T20:31:06.914Z",
    "comment": ""
};

var migrationCommands = function(transaction) {
    return [{
            fn: "createTable",
            params: [
                "events",
                {
                    "id": {
                        "type": Sequelize.STRING,
                        "field": "id",
                        "primaryKey": true,
                        "unique": true,
                        "allowNull": false
                    },
                    "raw_id": {
                        "type": Sequelize.STRING,
                        "field": "raw_id",
                        "allowNull": true
                    },
                    "chain_id": {
                        "type": Sequelize.INTEGER,
                        "field": "chain_id",
                        "allowNull": false
                    },
                    "contract_address": {
                        "type": Sequelize.STRING,
                        "field": "contract_address",
                        "allowNull": false
                    },
                    "block_number": {
                        "type": Sequelize.INTEGER,
                        "field": "block_number",
                        "allowNull": false
                    },
                    "transaction_hash": {
                        "type": Sequelize.STRING,
                        "field": "transaction_hash",
                        "allowNull": false
                    },
                    "transaction_index": {
                        "type": Sequelize.INTEGER,
                        "field": "transaction_index",
                        "allowNull": false
                    },
                    "block_hash": {
                        "type": Sequelize.STRING,
                        "field": "block_hash",
                        "allowNull": false
                    },
                    "log_index": {
                        "type": Sequelize.INTEGER,
                        "field": "log_index",
                        "allowNull": false
                    },
                    "removed": {
                        "type": Sequelize.BOOLEAN,
                        "field": "removed",
                        "allowNull": false
                    },
                    "return_values": {
                        "type": Sequelize.JSON,
                        "field": "return_values",
                        "allowNull": true
                    },
                    "event": {
                        "type": Sequelize.STRING,
                        "field": "event",
                        "allowNull": true
                    },
                    "signature": {
                        "type": Sequelize.STRING,
                        "field": "signature",
                        "allowNull": true
                    },
                    "raw": {
                        "type": Sequelize.JSON,
                        "field": "raw",
                        "allowNull": true
                    },
                    "topic0": {
                        "type": Sequelize.STRING,
                        "field": "topic0",
                        "allowNull": true
                    },
                    "topic1": {
                        "type": Sequelize.STRING,
                        "field": "topic1",
                        "allowNull": true
                    },
                    "topic2": {
                        "type": Sequelize.STRING,
                        "field": "topic2",
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
                "event_scans",
                {
                    "id": {
                        "type": Sequelize.STRING,
                        "field": "id",
                        "primaryKey": true,
                        "unique": true,
                        "allowNull": false
                    },
                    "chain_id": {
                        "type": Sequelize.INTEGER,
                        "field": "chain_id",
                        "unique": false,
                        "allowNull": false
                    },
                    "contract_address": {
                        "type": Sequelize.STRING,
                        "field": "contract_address",
                        "allowNull": false
                    },
                    "from_block": {
                        "type": Sequelize.INTEGER,
                        "field": "from_block",
                        "allowNull": false
                    },
                    "to_block": {
                        "type": Sequelize.INTEGER,
                        "field": "to_block",
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
            fn: "addIndex",
            params: [
                "events",
                ["chain_id", "raw_id"],
                {
                    "indexName": "events_chain_id_raw_id",
                    "name": "events_chain_id_raw_id",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "events",
                ["topic2"],
                {
                    "indexName": "events_topic2",
                    "name": "events_topic2",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "events",
                ["topic1"],
                {
                    "indexName": "events_topic1",
                    "name": "events_topic1",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "events",
                ["topic0"],
                {
                    "indexName": "events_topic0",
                    "name": "events_topic0",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "events",
                ["chain_id", "contract_address", "event", "block_number"],
                {
                    "indexName": "events_chain_id_contract_address_event_block_number",
                    "name": "events_chain_id_contract_address_event_block_number",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "events",
                ["chain_id", "contract_address", "block_number"],
                {
                    "indexName": "events_chain_id_contract_address_block_number",
                    "name": "events_chain_id_contract_address_block_number",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "events",
                ["chain_id", "contract_address", "event", "log_index"],
                {
                    "indexName": "events_chain_id_contract_address_event_log_index",
                    "name": "events_chain_id_contract_address_event_log_index",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "events",
                ["chain_id", "contract_address", "event"],
                {
                    "indexName": "events_chain_id_contract_address_event",
                    "name": "events_chain_id_contract_address_event",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "events",
                ["chain_id", "log_index"],
                {
                    "indexName": "events_chain_id_log_index",
                    "name": "events_chain_id_log_index",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "events",
                ["chain_id", "block_number"],
                {
                    "indexName": "events_chain_id_block_number",
                    "name": "events_chain_id_block_number",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "events",
                ["chain_id"],
                {
                    "indexName": "events_chain_id",
                    "name": "events_chain_id",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "event_scans",
                ["chain_id", "contract_address", "to_block"],
                {
                    "indexName": "event_scans_chain_id_contract_address_to_block",
                    "name": "event_scans_chain_id_contract_address_to_block",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "event_scans",
                ["chain_id", "contract_address", "from_block"],
                {
                    "indexName": "event_scans_chain_id_contract_address_from_block",
                    "name": "event_scans_chain_id_contract_address_from_block",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "event_scans",
                ["chain_id", "to_block"],
                {
                    "indexName": "event_scans_chain_id_to_block",
                    "name": "event_scans_chain_id_to_block",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "event_scans",
                ["chain_id", "from_block"],
                {
                    "indexName": "event_scans_chain_id_from_block",
                    "name": "event_scans_chain_id_from_block",
                    "transaction": transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "event_scans",
                ["chain_id"],
                {
                    "indexName": "event_scans_chain_id",
                    "name": "event_scans_chain_id",
                    "transaction": transaction
                }
            ]
        }
    ];
};
var rollbackCommands = function(transaction) {
    return [{
            fn: "dropTable",
            params: ["events", {
                transaction: transaction
            }]
        },
        {
            fn: "dropTable",
            params: ["event_scans", {
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
                        console.log("[#"+index+"] execute: " + command.fn);
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
