const Sequelize = require("sequelize");

/**
 * Actions summary:
 *
 * dropTable() => "providers", deps: []
 * dropTable() => "provider_chunks", deps: []
 * dropTable() => "redkeys", deps: []
 *
 */

const info = {
  revision: 3,
  name: "remove-unused-tables",
  created: "2022-03-10T17:09:40.267Z",
  comment: "",
};

const migrationCommands = (transaction) => [
  {
    fn: "dropTable",
    params: ["providers", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["provider_chunks", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["redkeys", { transaction }],
  },
];

const rollbackCommands = (transaction) => [
  {
    fn: "createTable",
    params: [
      "providers",
      {
        id: {
          type: Sequelize.STRING,
          field: "id",
          primaryKey: true,
          unique: true,
          allowNull: false,
        },
        connection: {
          type: Sequelize.STRING,
          field: "connection",
          allowNull: false,
        },
        address: { type: Sequelize.STRING, field: "address", allowNull: false },
        created_at: {
          type: Sequelize.DATE,
          field: "created_at",
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          field: "updated_at",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "provider_chunks",
      {
        id: {
          type: Sequelize.STRING,
          field: "id",
          primaryKey: true,
          unique: true,
          allowNull: false,
        },
        size: { type: Sequelize.INTEGER, field: "size", allowNull: true },
        real_id: { type: Sequelize.STRING, field: "real_id", allowNull: true },
        real_id_verified: {
          type: Sequelize.BOOLEAN,
          field: "real_id_verified",
          allowNull: true,
        },
        real_size: {
          type: Sequelize.INTEGER,
          field: "real_size",
          allowNull: true,
        },
        status: {
          type: Sequelize.STRING,
          field: "status",
          defaultValue: "s0",
          allowNull: false,
        },
        public_key: {
          type: Sequelize.TEXT,
          field: "public_key",
          allowNull: true,
        },
        segment_hashes: {
          type: Sequelize.JSON,
          field: "segment_hashes",
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          field: "created_at",
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          field: "updated_at",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "redkeys",
      {
        id: {
          type: Sequelize.BIGINT,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          unique: true,
          allowNull: false,
        },
        index: { type: Sequelize.INTEGER, field: "index", allowNull: false },
        private_key: {
          type: Sequelize.TEXT,
          field: "private_key",
          allowNull: false,
        },
        public_key: {
          type: Sequelize.TEXT,
          field: "public_key",
          allowNull: false,
        },
        created_at: {
          type: Sequelize.DATE,
          field: "created_at",
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          field: "updated_at",
          allowNull: false,
        },
        provider_id: {
          type: Sequelize.STRING,
          field: "provider_id",
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
          references: { model: "providers", key: "id" },
          allowNull: true,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "providers",
      ["address"],
      {
        indexName: "providers_address",
        name: "providers_address",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "provider_chunks",
      ["status"],
      {
        indexName: "provider_chunks_status",
        name: "provider_chunks_status",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "provider_chunks",
      ["real_id"],
      {
        indexName: "provider_chunks_real_id",
        name: "provider_chunks_real_id",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "redkeys",
      ["provider_id", "index"],
      {
        indexName: "provider_id_index_unique",
        name: "provider_id_index_unique",
        indicesType: "UNIQUE",
        type: "UNIQUE",
        transaction,
      },
    ],
  },
];

const pos = 0;
const useTransaction = true;

const execute = (queryInterface, sequelize, _commands) => {
  let index = pos;
  const run = (transaction) => {
    const commands = _commands(transaction);
    return new Promise((resolve, reject) => {
      const next = () => {
        if (index < commands.length) {
          const command = commands[index];
          console.log(`[#${index}] execute: ${command.fn}`);
          index++;
          queryInterface[command.fn](...command.params).then(next, reject);
        } else resolve();
      };
      next();
    });
  };
  if (useTransaction) return queryInterface.sequelize.transaction(run);
  return run(null);
};

module.exports = {
  pos,
  useTransaction,
  up: (queryInterface, sequelize) =>
    execute(queryInterface, sequelize, migrationCommands),
  down: (queryInterface, sequelize) =>
    execute(queryInterface, sequelize, rollbackCommands),
  info,
};
