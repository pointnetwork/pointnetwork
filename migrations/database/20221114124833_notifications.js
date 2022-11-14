const Sequelize = require("sequelize");

/**
 * Actions summary:
 *
 * dropTable() => "events", deps: []
 * dropTable() => "event_scans", deps: []
 * createTable() => "notifications", deps: []
 * addIndex(notifications_timestamp) => "notifications"
 * addIndex(notifications_block_number) => "notifications"
 * addIndex(notifications_identity_contract_event) => "notifications"
 * addIndex(notifications_identity_contract) => "notifications"
 * addIndex(notifications_identity) => "notifications"
 * addIndex(notifications_address_event) => "notifications"
 * addIndex(notifications_address) => "notifications"
 * addIndex(notifications_viewed) => "notifications"
 * addIndex(notifications_id) => "notifications"
 *
 */

const info = {
  revision: 7,
  name: "notifications",
  created: "2022-11-14T12:48:33.171Z",
  comment: "",
};

const migrationCommands = (transaction) => [
  {
    fn: "dropTable",
    params: ["events", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["event_scans", { transaction }],
  },
  {
    fn: "createTable",
    params: [
      "notifications",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          primaryKey: true,
          unique: true,
          allowNull: false,
        },
        block_number: {
          type: Sequelize.STRING,
          field: "block_number",
          allowNull: false,
        },
        timestamp: {
          type: Sequelize.DATE,
          field: "timestamp",
          allowNull: false,
        },
        identity: {
          type: Sequelize.STRING,
          field: "identity",
          allowNull: true,
        },
        address: { type: Sequelize.STRING, field: "address", allowNull: false },
        contract: {
          type: Sequelize.STRING,
          field: "contract",
          allowNull: true,
        },
        event: { type: Sequelize.STRING, field: "event", allowNull: true },
        title: { type: Sequelize.STRING, field: "title", allowNull: true },
        text: { type: Sequelize.STRING, field: "text", allowNull: true },
        link: { type: Sequelize.STRING, field: "link", allowNull: true },
        arguments: {
          type: Sequelize.JSON,
          field: "arguments",
          allowNull: true,
        },
        viewed: {
          type: Sequelize.BOOLEAN,
          field: "viewed",
          default: false,
          allowNull: false,
        },
        log: { type: Sequelize.JSON, field: "log", allowNull: false },
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
    fn: "addIndex",
    params: [
      "notifications",
      ["timestamp"],
      {
        indexName: "notifications_timestamp",
        name: "notifications_timestamp",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "notifications",
      ["block_number"],
      {
        indexName: "notifications_block_number",
        name: "notifications_block_number",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "notifications",
      ["identity", "contract", "event"],
      {
        indexName: "notifications_identity_contract_event",
        name: "notifications_identity_contract_event",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "notifications",
      ["identity", "contract"],
      {
        indexName: "notifications_identity_contract",
        name: "notifications_identity_contract",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "notifications",
      ["identity"],
      {
        indexName: "notifications_identity",
        name: "notifications_identity",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "notifications",
      ["address", "event"],
      {
        indexName: "notifications_address_event",
        name: "notifications_address_event",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "notifications",
      ["address"],
      {
        indexName: "notifications_address",
        name: "notifications_address",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "notifications",
      ["viewed"],
      {
        indexName: "notifications_viewed",
        name: "notifications_viewed",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "notifications",
      ["id"],
      { indexName: "notifications_id", name: "notifications_id", transaction },
    ],
  },
];

const rollbackCommands = (transaction) => [
  {
    fn: "dropTable",
    params: ["notifications", { transaction }],
  },
  {
    fn: "createTable",
    params: [
      "events",
      {
        id: {
          type: Sequelize.STRING,
          field: "id",
          primaryKey: true,
          unique: true,
          allowNull: false,
        },
        raw_id: { type: Sequelize.STRING, field: "raw_id", allowNull: true },
        chain_id: {
          type: Sequelize.INTEGER,
          field: "chain_id",
          allowNull: false,
        },
        contract_address: {
          type: Sequelize.STRING,
          field: "contract_address",
          allowNull: false,
        },
        block_number: {
          type: Sequelize.INTEGER,
          field: "block_number",
          allowNull: false,
        },
        transaction_hash: {
          type: Sequelize.STRING,
          field: "transaction_hash",
          allowNull: false,
        },
        transaction_index: {
          type: Sequelize.INTEGER,
          field: "transaction_index",
          allowNull: false,
        },
        block_hash: {
          type: Sequelize.STRING,
          field: "block_hash",
          allowNull: false,
        },
        log_index: {
          type: Sequelize.INTEGER,
          field: "log_index",
          allowNull: false,
        },
        removed: {
          type: Sequelize.BOOLEAN,
          field: "removed",
          allowNull: false,
        },
        return_values: {
          type: Sequelize.JSON,
          field: "return_values",
          allowNull: true,
        },
        event: { type: Sequelize.STRING, field: "event", allowNull: true },
        signature: {
          type: Sequelize.STRING,
          field: "signature",
          allowNull: true,
        },
        raw: { type: Sequelize.JSON, field: "raw", allowNull: true },
        topic0: { type: Sequelize.STRING, field: "topic0", allowNull: true },
        topic1: { type: Sequelize.STRING, field: "topic1", allowNull: true },
        topic2: { type: Sequelize.STRING, field: "topic2", allowNull: true },
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
      "event_scans",
      {
        id: {
          type: Sequelize.STRING,
          field: "id",
          primaryKey: true,
          unique: true,
          allowNull: false,
        },
        chain_id: {
          type: Sequelize.INTEGER,
          field: "chain_id",
          unique: false,
          allowNull: false,
        },
        contract_address: {
          type: Sequelize.STRING,
          field: "contract_address",
          allowNull: false,
        },
        from_block: {
          type: Sequelize.INTEGER,
          field: "from_block",
          allowNull: false,
        },
        to_block: {
          type: Sequelize.INTEGER,
          field: "to_block",
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
      },
      { transaction },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "events",
      ["chain_id"],
      { indexName: "events_chain_id", name: "events_chain_id", transaction },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "events",
      ["chain_id", "block_number"],
      {
        indexName: "events_chain_id_block_number",
        name: "events_chain_id_block_number",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "events",
      ["chain_id", "log_index"],
      {
        indexName: "events_chain_id_log_index",
        name: "events_chain_id_log_index",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "events",
      ["chain_id", "contract_address", "event"],
      {
        indexName: "events_chain_id_contract_address_event",
        name: "events_chain_id_contract_address_event",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "events",
      ["chain_id", "contract_address", "event", "log_index"],
      {
        indexName: "events_chain_id_contract_address_event_log_index",
        name: "events_chain_id_contract_address_event_log_index",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "events",
      ["chain_id", "contract_address", "block_number"],
      {
        indexName: "events_chain_id_contract_address_block_number",
        name: "events_chain_id_contract_address_block_number",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "events",
      ["chain_id", "contract_address", "event", "block_number"],
      {
        indexName: "events_chain_id_contract_address_event_block_number",
        name: "events_chain_id_contract_address_event_block_number",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "events",
      ["topic0"],
      { indexName: "events_topic0", name: "events_topic0", transaction },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "events",
      ["topic1"],
      { indexName: "events_topic1", name: "events_topic1", transaction },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "events",
      ["topic2"],
      { indexName: "events_topic2", name: "events_topic2", transaction },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "events",
      ["chain_id", "raw_id"],
      {
        indexName: "events_chain_id_raw_id",
        name: "events_chain_id_raw_id",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "event_scans",
      ["chain_id"],
      {
        indexName: "event_scans_chain_id",
        name: "event_scans_chain_id",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "event_scans",
      ["chain_id", "from_block"],
      {
        indexName: "event_scans_chain_id_from_block",
        name: "event_scans_chain_id_from_block",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "event_scans",
      ["chain_id", "to_block"],
      {
        indexName: "event_scans_chain_id_to_block",
        name: "event_scans_chain_id_to_block",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "event_scans",
      ["chain_id", "contract_address", "from_block"],
      {
        indexName: "event_scans_chain_id_contract_address_from_block",
        name: "event_scans_chain_id_contract_address_from_block",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "event_scans",
      ["chain_id", "contract_address", "to_block"],
      {
        indexName: "event_scans_chain_id_contract_address_to_block",
        name: "event_scans_chain_id_contract_address_to_block",
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
