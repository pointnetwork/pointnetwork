const Sequelize = require("sequelize");

/**
 * Actions summary:
 *
 * addColumn(txid) => "chunks"
 *
 */

const info = {
  revision: 4,
  name: "add-txid-to-chunks",
  created: "2022-04-01T17:24:04.984Z",
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
];

const rollbackCommands = (transaction) => [
  {
    fn: "removeColumn",
    params: ["chunks", "txid", { transaction }],
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
