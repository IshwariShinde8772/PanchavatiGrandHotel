"use strict";

async function addMissingColumns(queryInterface, tableName, definitions) {
  const metadata = await queryInterface.describeTable(tableName);
  for (const [column, definition] of Object.entries(definitions)) {
    if (!metadata[column]) {
      await queryInterface.addColumn(tableName, column, definition);
    }
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await addMissingColumns(queryInterface, "bookings", {
      checked_out_by_role: { type: Sequelize.STRING(30), allowNull: true },
      is_early_checkout: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      early_checkout_at: { type: Sequelize.DATE, allowNull: true },
      early_checkout_reason: { type: Sequelize.TEXT, allowNull: true },
      early_checkout_note: { type: Sequelize.TEXT, allowNull: true },
      original_checkout_date: { type: Sequelize.DATEONLY, allowNull: true },
      early_checkout_refund_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      early_checkout_adjustment_charge: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      early_checkout_policy_applied: { type: Sequelize.STRING(160), allowNull: true },
      room_status_after_checkout: { type: Sequelize.STRING(30), allowNull: true },
    });
  },

  async down(queryInterface) {
    for (const column of [
      "room_status_after_checkout",
      "early_checkout_policy_applied",
      "early_checkout_adjustment_charge",
      "early_checkout_refund_amount",
      "original_checkout_date",
      "early_checkout_note",
      "early_checkout_reason",
      "early_checkout_at",
      "is_early_checkout",
      "checked_out_by_role",
    ]) {
      const metadata = await queryInterface.describeTable("bookings");
      if (metadata[column]) {
        await queryInterface.removeColumn("bookings", column);
      }
    }
  },
};
