"use strict";

async function addMissingColumns(queryInterface, tableName, definitions) {
  const metadata = await queryInterface.describeTable(tableName);
  for (const [column, definition] of Object.entries(definitions)) {
    if (!metadata[column]) {
      await queryInterface.addColumn(tableName, column, definition);
    }
  }
}

async function removeExistingColumns(queryInterface, tableName, columns) {
  for (const column of columns) {
    const metadata = await queryInterface.describeTable(tableName);
    if (metadata[column]) {
      await queryInterface.removeColumn(tableName, column);
    }
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await addMissingColumns(queryInterface, "booking_extension_requests", {
      original_checkout_date: { type: Sequelize.DATEONLY, allowNull: true },
      extended_checkout_date: { type: Sequelize.DATEONLY, allowNull: true },
      extension_nights: { type: Sequelize.INTEGER, allowNull: true },
      extension_base_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      extension_discount_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      extension_tax_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      extension_payable_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      extension_paid_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      extension_remaining_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      original_booking_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      original_paid_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      payment_reference: { type: Sequelize.STRING(255), allowNull: true },
      payment_note: { type: Sequelize.TEXT, allowNull: true },
      payment_confirmed_by: { type: Sequelize.INTEGER, allowNull: true },
      payment_confirmed_by_role: { type: Sequelize.STRING(30), allowNull: true },
      payment_confirmed_at: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.sequelize.query(`
      UPDATE booking_extension_requests
      SET
        original_checkout_date = COALESCE(original_checkout_date, requested_from),
        extended_checkout_date = COALESCE(extended_checkout_date, requested_to),
        extension_nights = COALESCE(extension_nights, GREATEST(DATEDIFF(requested_to, requested_from), 1)),
        extension_base_amount = CASE WHEN extension_base_amount = 0 THEN extra_fare ELSE extension_base_amount END,
        extension_tax_amount = CASE WHEN extension_tax_amount = 0 THEN extra_gst ELSE extension_tax_amount END,
        extension_payable_amount = CASE WHEN extension_payable_amount = 0 THEN extra_amount ELSE extension_payable_amount END,
        extension_paid_amount = CASE WHEN payment_status = 'paid' THEN extra_amount ELSE extension_paid_amount END,
        extension_remaining_amount = CASE WHEN payment_status = 'paid' THEN 0 ELSE extra_amount END
    `);

    await queryInterface.changeColumn("booking_extension_requests", "original_checkout_date", {
      type: Sequelize.DATEONLY,
      allowNull: false,
    });
    await queryInterface.changeColumn("booking_extension_requests", "extended_checkout_date", {
      type: Sequelize.DATEONLY,
      allowNull: false,
    });
    await queryInterface.changeColumn("booking_extension_requests", "extension_nights", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    await queryInterface.sequelize.query(`
      UPDATE booking_extension_requests
      SET payment_method = NULL
      WHERE payment_method = 'qr'
    `);
    await queryInterface.changeColumn("booking_extension_requests", "payment_method", {
      type: Sequelize.ENUM("cash", "upi", "card", "other"),
      allowNull: true,
    });

    await addMissingColumns(queryInterface, "payment_transactions", {
      extension_request_id: { type: Sequelize.INTEGER, allowNull: true },
      confirmed_by_user_id: { type: Sequelize.INTEGER, allowNull: true },
      confirmed_by_role: { type: Sequelize.STRING(30), allowNull: true },
    });
    await queryInterface.changeColumn("payment_transactions", "payment_method", {
      type: Sequelize.ENUM("qr", "online", "upi", "cash", "card", "pay_later", "other"),
      allowNull: false,
      defaultValue: "qr",
    });
    await queryInterface.changeColumn("payment_transactions", "payment_type", {
      type: Sequelize.ENUM("full_booking", "reservation_advance", "reservation_balance", "extension_payment"),
      allowNull: false,
      defaultValue: "full_booking",
    });
    await queryInterface.sequelize.query(`
      UPDATE payment_transactions payment
      INNER JOIN booking_extension_requests extension_request
        ON payment.remarks = CONCAT('Extension request #', extension_request.id)
      SET
        payment.extension_request_id = extension_request.id,
        payment.payment_type = 'extension_payment',
        payment.status = CASE WHEN payment.status = 'pending' THEN 'cancelled' ELSE payment.status END
    `);

    await addMissingColumns(queryInterface, "bills", {
      extension_json: { type: Sequelize.JSON, allowNull: true },
      original_stay_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      original_paid_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      total_paid_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      remaining_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    });
  },

  async down(queryInterface) {
    await removeExistingColumns(queryInterface, "bills", [
      "remaining_amount",
      "total_paid_amount",
      "original_paid_amount",
      "original_stay_amount",
      "extension_json",
    ]);
    await removeExistingColumns(queryInterface, "payment_transactions", [
      "confirmed_by_role",
      "confirmed_by_user_id",
      "extension_request_id",
    ]);
    await removeExistingColumns(queryInterface, "booking_extension_requests", [
      "payment_confirmed_at",
      "payment_confirmed_by_role",
      "payment_confirmed_by",
      "payment_note",
      "payment_reference",
      "original_paid_amount",
      "original_booking_amount",
      "extension_remaining_amount",
      "extension_paid_amount",
      "extension_payable_amount",
      "extension_tax_amount",
      "extension_discount_amount",
      "extension_base_amount",
      "extension_nights",
      "extended_checkout_date",
      "original_checkout_date",
    ]);
  },
};
