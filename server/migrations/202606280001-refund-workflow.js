"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const booking = await queryInterface.describeTable("bookings");
    if (!booking.booking_type) await queryInterface.addColumn("bookings", "booking_type", { type: Sequelize.ENUM("confirmed_booking", "reserved_booking"), allowNull: false, defaultValue: "confirmed_booking" });
    if (!booking.refund_status) await queryInterface.addColumn("bookings", "refund_status", { type: Sequelize.STRING(30), allowNull: false, defaultValue: "not_applicable" });
    if (!booking.cancellation_policy_applied) await queryInterface.addColumn("bookings", "cancellation_policy_applied", { type: Sequelize.STRING(80), allowNull: true });
    await queryInterface.changeColumn("bookings", "status", { type: Sequelize.ENUM("pending", "reserved", "confirmed", "checked_in", "checked_out", "cancelled"), allowNull: false, defaultValue: "pending" });

    await queryInterface.createTable("refund_requests", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      booking_id: { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: "bookings", key: "id" }, onDelete: "CASCADE" },
      customer_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "customers", key: "id" } },
      customer_name: { type: Sequelize.STRING, allowNull: false },
      customer_email: Sequelize.STRING,
      customer_phone: Sequelize.STRING,
      total_booking_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      amount_paid: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      cancellation_charge: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      refund_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      refund_reason: Sequelize.TEXT,
      cancellation_policy_applied: { type: Sequelize.STRING(80), allowNull: false },
      status: { type: Sequelize.ENUM("pending", "approved", "processing", "completed", "rejected", "failed"), allowNull: false, defaultValue: "pending" },
      requested_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      approved_by_staff_id: Sequelize.INTEGER,
      approved_at: Sequelize.DATE,
      completed_at: Sequelize.DATE,
      rejected_at: Sequelize.DATE,
      rejection_reason: Sequelize.TEXT,
      payment_reference_id: Sequelize.STRING,
      refund_transaction_id: Sequelize.STRING,
      customer_upi_id: Sequelize.STRING,
      hotel_upi_id: Sequelize.STRING,
      failure_reason: Sequelize.TEXT,
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("refund_requests");
    await queryInterface.removeColumn("bookings", "cancellation_policy_applied");
    await queryInterface.removeColumn("bookings", "refund_status");
    await queryInterface.removeColumn("bookings", "booking_type");
  },
};
