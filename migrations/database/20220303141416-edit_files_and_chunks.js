'use strict';

module.exports = {
    up: async (queryInterface, {DataTypes}) => queryInterface.sequelize.transaction(
        async transaction => {
            await queryInterface.removeColumn('files', 'chunkIds', {transaction});
            await queryInterface.removeColumn('files', 'redundancy', {transaction});
            await queryInterface.removeColumn('files', 'autorenew', {transaction});
            await queryInterface.removeColumn('chunks', 'redundancy', {transaction});
            await queryInterface.removeColumn('chunks', 'autorenew', {transaction});
            await queryInterface.addColumn('chunks', 'retry_count', {
                type: DataTypes.INTEGER,
                defaultValue: 0
            }, {transaction});
        }),

    down: async (queryInterface, {DataTypes}) => queryInterface.sequelize.transaction(
        async transaction => {
            await queryInterface.addColumn('files', 'chunkIds', {
                type: DataTypes.JSON,
                allowNull: true
            }, {transaction});
            await queryInterface.addColumn('files', 'redundancy', {
                type: DataTypes.INTEGER,
                allowNull: true
            }, {transaction});
            await queryInterface.addColumn('files', 'autorenew', {
                type: DataTypes.BOOLEAN,
                allowNull: true
            }, {transaction});
            await queryInterface.addColumn('chunks', 'redundancy', {
                type: DataTypes.INTEGER,
                allowNull: true
            }, {transaction});
            await queryInterface.addColumn('chunks', 'autorenew', {
                type: DataTypes.BOOLEAN,
                allowNull: true
            }, {transaction});
            await queryInterface.removeColumn('chunks', 'retry_count', {transaction});
        })
};
