'use strict';

var Sequelize = require('sequelize');

/**
 * Actions summary:
 *
 * removeIndex "file_maps_file_id_chunk_id_chunk_index" from table "file_maps"
 * removeColumn "chunk_index" from table "file_maps"
 * addColumn "offset" to table "file_maps"
 * addIndex "file_maps_file_id_chunk_id_offset" to table "file_maps"
 *
 **/

var info = {
    "revision": 2,
    "name": "automigration",
    "created": "2021-08-30T14:06:46.156Z",
    "comment": ""
};

var migrationCommands = function(transaction) {
    return [{
            fn: "removeIndex",
            params: [
                "file_maps",
                "file_maps_file_id_chunk_id_chunk_index",
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "removeColumn",
            params: [
                "file_maps",
                "chunk_index",
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "addColumn",
            params: [
                "file_maps",
                "offset",
                {
                    "type": Sequelize.INTEGER,
                    "field": "offset",
                    "allowNull": false
                },
                {
                    transaction: transaction
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
        }
    ];
};
var rollbackCommands = function(transaction) {
    return [{
            fn: "removeIndex",
            params: [
                "file_maps",
                "file_maps_file_id_chunk_id_offset",
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "removeColumn",
            params: [
                "file_maps",
                "offset",
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "addColumn",
            params: [
                "file_maps",
                "chunk_index",
                {
                    "type": Sequelize.INTEGER,
                    "field": "chunk_index",
                    "allowNull": false
                },
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "addIndex",
            params: [
                "file_maps",
                ["file_id", "chunk_id", "chunk_index"],
                {
                    "indexName": "file_maps_file_id_chunk_id_chunk_index",
                    "name": "file_maps_file_id_chunk_id_chunk_index",
                    "transaction": transaction
                }
            ]
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
