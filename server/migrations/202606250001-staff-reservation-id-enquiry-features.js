"use strict";

async function addColumnIfMissing(queryInterface, Sequelize, tableName, columnName, definition) {
  const table = await queryInterface.describeTable(tableName);
  if (!table[columnName]) {
    const safeDefinition = { ...definition };
    const typeText = String(definition.type || "").toUpperCase();

    if (
      safeDefinition.allowNull === false
      && !Object.prototype.hasOwnProperty.call(safeDefinition, "defaultValue")
      && (typeText.includes("DATE") || typeText.includes("TIME"))
    ) {
      safeDefinition.defaultValue = Sequelize.literal("CURRENT_TIMESTAMP");
    }

    await queryInterface.addColumn(tableName, columnName, safeDefinition);
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
    await queryInterface.changeColumn("staff", "email", {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });
    await queryInterface.changeColumn("staff", "role", {
      type: Sequelize.ENUM("receptionist", "housekeeping", "kitchen", "server", "waiter", "manager", "admin_staff"),
      allowNull: false,
    });

    await addColumnIfMissing(queryInterface, Sequelize, "staff", "specific_role", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing(queryInterface, Sequelize, "staff", "address", { type: Sequelize.TEXT, allowNull: true });
    await addColumnIfMissing(queryInterface, Sequelize, "staff", "gender", { type: Sequelize.ENUM("male", "female", "other"), allowNull: true });
    await addColumnIfMissing(queryInterface, Sequelize, "staff", "joining_date", { type: Sequelize.DATEONLY, allowNull: true });
    await addColumnIfMissing(queryInterface, Sequelize, "staff", "shift", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing(queryInterface, Sequelize, "staff", "id_proof_type", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing(queryInterface, Sequelize, "staff", "id_proof_url", { type: Sequelize.TEXT, allowNull: true });
    await addColumnIfMissing(queryInterface, Sequelize, "staff", "id_proof_public_id", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing(queryInterface, Sequelize, "staff", "created_by_staff_id", { type: Sequelize.INTEGER, allowNull: true });
    await addColumnIfMissing(queryInterface, Sequelize, "staff", "updated_at", {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    });

    await addColumnIfMissing(queryInterface, Sequelize, "bookings", "base_amount", { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
    await addColumnIfMissing(queryInterface, Sequelize, "bookings", "discount_amount", { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
    await addColumnIfMissing(queryInterface, Sequelize, "bookings", "offer_id", { type: Sequelize.INTEGER, allowNull: true });
    await addColumnIfMissing(queryInterface, Sequelize, "bookings", "advance_amount", { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
    await addColumnIfMissing(queryInterface, Sequelize, "bookings", "advance_paid", { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
    await addColumnIfMissing(queryInterface, Sequelize, "bookings", "remaining_amount", { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
    await addColumnIfMissing(queryInterface, Sequelize, "bookings", "cancellation_charge", { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
    await addColumnIfMissing(queryInterface, Sequelize, "bookings", "refund_amount", { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
    await addColumnIfMissing(queryInterface, Sequelize, "bookings", "cancelled_by", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing(queryInterface, Sequelize, "bookings", "id_verification_status", { type: Sequelize.ENUM("pending", "verified", "rejected"), allowNull: false, defaultValue: "pending" });
    await addColumnIfMissing(queryInterface, Sequelize, "bookings", "id_verified_by_staff_id", { type: Sequelize.INTEGER, allowNull: true });
    await addColumnIfMissing(queryInterface, Sequelize, "bookings", "id_verified_at", { type: Sequelize.DATE, allowNull: true });
    await addColumnIfMissing(queryInterface, Sequelize, "bookings", "id_verification_note", { type: Sequelize.TEXT, allowNull: true });

    await addColumnIfMissing(queryInterface, Sequelize, "customers", "id_doc_public_id", { type: Sequelize.STRING, allowNull: true });
    await addColumnIfMissing(queryInterface, Sequelize, "customers", "live_photo_url", { type: Sequelize.TEXT, allowNull: true });
    await addColumnIfMissing(queryInterface, Sequelize, "customers", "live_photo_public_id", { type: Sequelize.STRING, allowNull: true });

    await addColumnIfMissing(queryInterface, Sequelize, "enquiries", "enquiry_type", { type: Sequelize.STRING, allowNull: false, defaultValue: "room_booking" });
    await addColumnIfMissing(queryInterface, Sequelize, "enquiries", "status", { type: Sequelize.STRING, allowNull: false, defaultValue: "new" });
    await addColumnIfMissing(queryInterface, Sequelize, "enquiries", "created_by_staff_id", { type: Sequelize.INTEGER, allowNull: true });

    await queryInterface.changeColumn("notifications", "type", {
      type: Sequelize.ENUM("booking", "payment", "maintenance", "task", "system", "enquiry"),
      allowNull: false,
    });
  },

  async down(queryInterface) {
    for (const [tableName, columns] of Object.entries({
      staff: ["updated_at", "created_by_staff_id", "id_proof_public_id", "id_proof_url", "id_proof_type", "shift", "joining_date", "gender", "address", "specific_role"],
      bookings: ["id_verification_note", "id_verified_at", "id_verified_by_staff_id", "id_verification_status", "cancelled_by", "refund_amount", "cancellation_charge", "remaining_amount", "advance_paid", "advance_amount", "offer_id", "discount_amount", "base_amount"],
      customers: ["live_photo_public_id", "live_photo_url", "id_doc_public_id"],
      enquiries: ["created_by_staff_id", "status", "enquiry_type"],
    })) {
      for (const column of columns) {
        await removeColumnIfPresent(queryInterface, tableName, column);
      }
    }
  },
};
