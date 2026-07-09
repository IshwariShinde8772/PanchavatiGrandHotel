"use strict";

const REFUND_STATUSES = [
  "pending_admin_approval",
  "pending",
  "approved",
  "processing",
  "completed",
  "rejected",
  "failed",
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("refund_requests");

    await queryInterface.changeColumn("refund_requests", "status", {
      type: Sequelize.ENUM(...REFUND_STATUSES),
      allowNull: false,
      defaultValue: "pending_admin_approval",
    });
    await queryInterface.bulkUpdate(
      "refund_requests",
      { status: "pending_admin_approval" },
      { status: "pending" }
    );

    if (!table.processed_by_admin_id) {
      await queryInterface.addColumn("refund_requests", "processed_by_admin_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "admins", key: "id" },
      });
    }
    if (!table.processed_at) {
      await queryInterface.addColumn("refund_requests", "processed_at", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
    if (!table.refunded_at) {
      await queryInterface.addColumn("refund_requests", "refunded_at", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
    if (!table.razorpay_payment_id) {
      await queryInterface.addColumn("refund_requests", "razorpay_payment_id", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
    if (!table.razorpay_refund_id) {
      await queryInterface.addColumn("refund_requests", "razorpay_refund_id", {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("refund_requests");
    await queryInterface.bulkUpdate(
      "refund_requests",
      { status: "pending" },
      { status: "pending_admin_approval" }
    );
    await queryInterface.changeColumn("refund_requests", "status", {
      type: Sequelize.ENUM("pending", "approved", "processing", "completed", "rejected", "failed"),
      allowNull: false,
      defaultValue: "pending",
    });

    for (const column of [
      "razorpay_refund_id",
      "razorpay_payment_id",
      "refunded_at",
      "processed_at",
      "processed_by_admin_id",
    ]) {
      if (table[column]) {
        await queryInterface.removeColumn("refund_requests", column);
      }
    }
  },
};
