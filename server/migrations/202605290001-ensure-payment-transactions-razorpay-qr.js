"use strict";

const TABLE_NAME = "payment_transactions";
const PAYMENT_METHODS = ["qr", "online", "upi", "cash", "card", "pay_later"];
const PAYMENT_STATUSES = ["pending", "paid", "expired", "cancelled", "failed"];

async function describeTableSafe(queryInterface, tableName) {
  try {
    return await queryInterface.describeTable(tableName);
  } catch (error) {
    const message = String(error?.message || "");
    if (/doesn't exist|unknown table/i.test(message)) {
      return null;
    }

    throw error;
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await describeTableSafe(queryInterface, TABLE_NAME);

    if (!table) {
      await queryInterface.createTable(TABLE_NAME, {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        booking_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "bookings", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        customer_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "customers", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        currency: { type: Sequelize.STRING(10), allowNull: false, defaultValue: "INR" },
        payment_method: {
          type: Sequelize.ENUM(...PAYMENT_METHODS),
          allowNull: false,
          defaultValue: "qr",
        },
        status: {
          type: Sequelize.ENUM(...PAYMENT_STATUSES),
          allowNull: false,
          defaultValue: "pending",
        },
        upi_id: { type: Sequelize.STRING(255), allowNull: true },
        razorpay_qr_id: { type: Sequelize.STRING(255), allowNull: true },
        qr_payload: { type: Sequelize.TEXT, allowNull: true },
        qr_image_url: { type: Sequelize.TEXT, allowNull: true },
        qr_expires_at: { type: Sequelize.DATE, allowNull: true },
        payment_reference: { type: Sequelize.STRING(255), allowNull: true },
        paid_at: { type: Sequelize.DATE, allowNull: true },
        remarks: { type: Sequelize.TEXT, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
      return;
    }

    if (!table.razorpay_qr_id) {
      await queryInterface.addColumn(TABLE_NAME, "razorpay_qr_id", {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await describeTableSafe(queryInterface, TABLE_NAME);
    if (table && table.razorpay_qr_id) {
      await queryInterface.removeColumn(TABLE_NAME, "razorpay_qr_id");
    }
  },
};
