"use strict";

async function addMissingColumns(queryInterface, tableName, definitions) {
  const table = await queryInterface.describeTable(tableName);

  for (const [column, definition] of Object.entries(definitions)) {
    if (!table[column]) {
      await queryInterface.addColumn(tableName, column, definition);
    }
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await addMissingColumns(queryInterface, "bookings", {
      checked_in_by_staff_id: { type: Sequelize.INTEGER, allowNull: true },
      checked_out_by_staff_id: { type: Sequelize.INTEGER, allowNull: true },
    });

    await addMissingColumns(queryInterface, "feedbacks", {
      room_id: { type: Sequelize.INTEGER, allowNull: true },
      room_number: { type: Sequelize.STRING, allowNull: true },
      room_name: { type: Sequelize.STRING, allowNull: true },
      internal_note: { type: Sequelize.TEXT, allowNull: true },
      source: {
        type: Sequelize.ENUM("customer", "receptionist_checkout"),
        allowNull: false,
        defaultValue: "customer",
      },
      collected_by_receptionist_id: { type: Sequelize.INTEGER, allowNull: true },
      collected_by_receptionist_name: { type: Sequelize.STRING, allowNull: true },
      collected_at: { type: Sequelize.DATE, allowNull: true },
      check_in_date: { type: Sequelize.DATEONLY, allowNull: true },
      check_out_date: { type: Sequelize.DATEONLY, allowNull: true },
    });
  },

  async down(queryInterface) {
    for (const column of [
      "check_out_date",
      "check_in_date",
      "collected_at",
      "collected_by_receptionist_name",
      "collected_by_receptionist_id",
      "source",
      "internal_note",
      "room_name",
      "room_number",
      "room_id",
    ]) {
      const table = await queryInterface.describeTable("feedbacks");
      if (table[column]) {
        await queryInterface.removeColumn("feedbacks", column);
      }
    }

    for (const column of ["checked_out_by_staff_id", "checked_in_by_staff_id"]) {
      const table = await queryInterface.describeTable("bookings");
      if (table[column]) {
        await queryInterface.removeColumn("bookings", column);
      }
    }
  },
};
