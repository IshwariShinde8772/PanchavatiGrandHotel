"use strict";

async function addColumnIfMissing(queryInterface, tableName, table, columnName, definition) {
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
    table[columnName] = definition;
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const booking = await queryInterface.describeTable("bookings");
    await addColumnIfMissing(queryInterface, "bookings", booking, "checkout_token", {
      type: Sequelize.STRING(64),
      allowNull: true,
      unique: true,
    });
    await queryInterface.changeColumn("bookings", "payment_status", {
      type: Sequelize.ENUM("pending", "partially_paid", "paid", "failed", "pay_at_hotel", "refunded"),
      allowNull: false,
      defaultValue: "pending",
    });

    const payment = await queryInterface.describeTable("payment_transactions");
    await addColumnIfMissing(queryInterface, "payment_transactions", payment, "razorpay_order_id", {
      type: Sequelize.STRING(255),
      allowNull: true,
      unique: true,
    });
    await addColumnIfMissing(queryInterface, "payment_transactions", payment, "razorpay_payment_id", {
      type: Sequelize.STRING(255),
      allowNull: true,
      unique: true,
    });
    await addColumnIfMissing(queryInterface, "payment_transactions", payment, "razorpay_signature", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, "payment_transactions", payment, "payment_type", {
      type: Sequelize.ENUM("full_booking", "reservation_advance", "reservation_balance"),
      allowNull: false,
      defaultValue: "full_booking",
    });
  },

  async down(queryInterface, Sequelize) {
    for (const column of ["payment_type", "razorpay_signature", "razorpay_payment_id", "razorpay_order_id"]) {
      const payment = await queryInterface.describeTable("payment_transactions");
      if (payment[column]) await queryInterface.removeColumn("payment_transactions", column);
    }

    const booking = await queryInterface.describeTable("bookings");
    if (booking.checkout_token) await queryInterface.removeColumn("bookings", "checkout_token");
    await queryInterface.changeColumn("bookings", "payment_status", {
      type: Sequelize.ENUM("pending", "partially_paid", "paid", "pay_at_hotel", "refunded"),
      allowNull: false,
      defaultValue: "pending",
    });
  },
};
