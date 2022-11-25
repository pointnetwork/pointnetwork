const Sequelize = require("sequelize");

/**
 * Actions summary:
 *
 * changeColumn(id) => "notifications"
 *
 */

const info = {
  revision: 8,
  name: "noname",
  created: "2022-11-17T14:34:41.302Z",
  comment: "",
};

const migrationCommands = (transaction) => [
  {
    fn: "changeColumn",
    params: [
      "notifications",
      "id",
      {
        type: Sequelize.INTEGER,
        field: "id",
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      { transaction },
    ],
  },
];

const rollbackCommands = (transaction) => [
  {
    fn: "changeColumn",
    params: [
      "notifications",
      "id",
      {
        type: Sequelize.INTEGER,
        field: "id",
        primaryKey: true,
        unique: true,
        allowNull: false,
      },
      { transaction },
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
