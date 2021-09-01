'use strict';

var Sequelize = require('sequelize');

/**
 * Actions summary:
 *
 * changeColumn "ul_status" on table "chunks"
 * changeColumn "dl_status" on table "chunks"
 * changeColumn "redundancy" on table "chunks"
 * changeColumn "expires" on table "chunks"
 * changeColumn "autorenew" on table "chunks"
 * changeColumn "size" on table "files"
 * changeColumn "ul_status" on table "files"
 * changeColumn "dl_status" on table "files"
 * changeColumn "redundancy" on table "files"
 * changeColumn "expires" on table "files"
 * changeColumn "autorenew" on table "files"
 *
 **/

var info = {
    "revision": 3,
    "name": "automigration",
    "created": "2021-08-31T20:34:16.635Z",
    "comment": ""
};

var migrationCommands = function(transaction) {
    return [{
            fn: "changeColumn",
            params: [
                "chunks",
                "ul_status",
                {
                    "type": Sequelize.STRING,
                    "field": "ul_status",
                    "defaultValue": "us0",
                    "allowNull": false
                },
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "changeColumn",
            params: [
                "chunks",
                "dl_status",
                {
                    "type": Sequelize.STRING,
                    "field": "dl_status",
                    "defaultValue": "ds0",
                    "allowNull": false
                },
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "changeColumn",
            params: [
                "chunks",
                "redundancy",
                {
                    "type": Sequelize.INTEGER,
                    "field": "redundancy",
                    "allowNull": true
                },
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "changeColumn",
            params: [
                "chunks",
                "expires",
                {
                    "type": Sequelize.BIGINT,
                    "field": "expires",
                    "allowNull": true
                },
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "changeColumn",
            params: [
                "chunks",
                "autorenew",
                {
                    "type": Sequelize.BOOLEAN,
                    "field": "autorenew",
                    "allowNull": true
                },
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "changeColumn",
            params: [
                "files",
                "size",
                {
                    "type": Sequelize.INTEGER,
                    "field": "size",
                    "allowNull": true
                },
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "changeColumn",
            params: [
                "files",
                "ul_status",
                {
                    "type": Sequelize.STRING,
                    "field": "ul_status",
                    "defaultValue": "us0",
                    "allowNull": false
                },
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "changeColumn",
            params: [
                "files",
                "dl_status",
                {
                    "type": Sequelize.STRING,
                    "field": "dl_status",
                    "defaultValue": "ds0",
                    "allowNull": false
                },
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "changeColumn",
            params: [
                "files",
                "redundancy",
                {
                    "type": Sequelize.INTEGER,
                    "field": "redundancy",
                    "allowNull": true
                },
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "changeColumn",
            params: [
                "files",
                "expires",
                {
                    "type": Sequelize.BIGINT,
                    "field": "expires",
                    "allowNull": true
                },
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "changeColumn",
            params: [
                "files",
                "autorenew",
                {
                    "type": Sequelize.BOOLEAN,
                    "field": "autorenew",
                    "allowNull": true
                },
                {
                    transaction: transaction
                }
            ]
        }
    ];
};
var rollbackCommands = function(transaction) {
    return [{
            fn: "changeColumn",
            params: [
                "chunks",
                "ul_status",
                {
                    "type": Sequelize.STRING,
                    "field": "ul_status",
                    "allowNull": false
                },
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "changeColumn",
            params: [
                "chunks",
                "dl_status",
                {
                    "type": Sequelize.STRING,
                    "field": "dl_status",
                    "allowNull": false
                },
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "changeColumn",
            params: [
                "chunks",
                "redundancy",
                {
                    "type": Sequelize.INTEGER,
                    "field": "redundancy",
                    "allowNull": false
                },
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "changeColumn",
            params: [
                "chunks",
                "expires",
                {
                    "type": Sequelize.BIGINT,
                    "field": "expires",
                    "allowNull": false
                },
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "changeColumn",
            params: [
                "chunks",
                "autorenew",
                {
                    "type": Sequelize.BOOLEAN,
                    "field": "autorenew",
                    "allowNull": false
                },
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "changeColumn",
            params: [
                "files",
                "size",
                {
                    "type": Sequelize.INTEGER,
                    "field": "size",
                    "allowNull": false
                },
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "changeColumn",
            params: [
                "files",
                "ul_status",
                {
                    "type": Sequelize.STRING,
                    "field": "ul_status",
                    "allowNull": false
                },
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "changeColumn",
            params: [
                "files",
                "dl_status",
                {
                    "type": Sequelize.STRING,
                    "field": "dl_status",
                    "allowNull": false
                },
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "changeColumn",
            params: [
                "files",
                "redundancy",
                {
                    "type": Sequelize.INTEGER,
                    "field": "redundancy",
                    "allowNull": false
                },
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "changeColumn",
            params: [
                "files",
                "expires",
                {
                    "type": Sequelize.BIGINT,
                    "field": "expires",
                    "allowNull": false
                },
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "changeColumn",
            params: [
                "files",
                "autorenew",
                {
                    "type": Sequelize.BOOLEAN,
                    "field": "autorenew",
                    "allowNull": false
                },
                {
                    transaction: transaction
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
