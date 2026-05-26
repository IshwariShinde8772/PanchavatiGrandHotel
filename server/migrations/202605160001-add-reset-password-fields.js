"use strict";

const TABLES = ["admins", "staff", "customers"];
const TOKEN_COLUMN = "reset_password_token";
const EXPIRES_COLUMN = "reset_password_expires";

async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
  const table = await queryInterface.describeTable(tableName);
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function removeColumnIfPresent(queryInterface, tableName, columnName) {
  const table = await queryInterface.describeTable(tableName);
  if (table[columnName]) {
    await queryInterface.removeColumn(tableName, columnName);
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const tableName of TABLES) {
      await addColumnIfMissing(queryInterface, tableName, TOKEN_COLUMN, {
        type: Sequelize.STRING(128),
        allowNull: true,
      });
      await addColumnIfMissing(queryInterface, tableName, EXPIRES_COLUMN, {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    for (const tableName of TABLES) {
      await removeColumnIfPresent(queryInterface, tableName, EXPIRES_COLUMN);
      await removeColumnIfPresent(queryInterface, tableName, TOKEN_COLUMN);
    }
  },
};
