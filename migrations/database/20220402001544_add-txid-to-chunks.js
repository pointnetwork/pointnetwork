const Sequelize = require("sequelize");

/**
 * Actions summary:
 *
 * addColumn(txid) => "chunks"
 * addColumn(validation_retry_count) => "chunks"
 *
 */

const info = {
  revision: 4,
  name: "add-txid-to-chunks",
  created: "2022-04-02T00:15:44.897Z",
  comment: "",
};

const migrationCommands = (transaction) => [
  {
    fn: "addColumn",
    params: [
      "chunks",
      "txid",
      { type: Sequelize.STRING, field: "txid", allowNull: true },
      { transaction },
    ],
  },
  {
    fn: "addColumn",
    params: [
      "chunks",
      "validation_retry_count",
      {
        type: Sequelize.INTEGER,
        field: "validation_retry_count",
        defaultValue: 0,
        allowNull: false,
      },
      { transaction },
    ],
  },
];

const rollbackCommands = (transaction) => [
  {
    fn: "removeColumn",
    params: ["chunks", "txid", { transaction }],
  },
  {
    fn: "removeColumn",
    params: ["chunks", "validation_retry_count", { transaction }],
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
