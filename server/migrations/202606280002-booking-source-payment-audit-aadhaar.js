"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const booking = await queryInterface.describeTable("bookings");
    if (!booking.reservation_type) {
      await queryInterface.addColumn("bookings", "reservation_type", {
        type: Sequelize.ENUM("confirmed_booking", "reserved_booking"),
        allowNull: false,
        defaultValue: "confirmed_booking",
      });
      await queryInterface.sequelize.query(
        "UPDATE bookings SET reservation_type = booking_type WHERE booking_type IN ('confirmed_booking','reserved_booking')"
      );
    }
    await queryInterface.changeColumn("bookings", "booking_type", {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "online",
    });
    await queryInterface.sequelize.query(
      "UPDATE bookings SET booking_type = CASE WHEN booked_by = 'receptionist' THEN 'manual' ELSE 'online' END"
    );
    await queryInterface.changeColumn("bookings", "booking_type", {
      type: Sequelize.ENUM("manual", "online"),
      allowNull: false,
      defaultValue: "online",
    });

    const fields = {
      amount_paid: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      razorpay_signature: { type: Sequelize.STRING, allowNull: true },
      payment_mode: { type: Sequelize.STRING(30), allowNull: true },
      payment_confirmed_by: { type: Sequelize.INTEGER, allowNull: true },
      payment_confirmed_at: { type: Sequelize.DATE, allowNull: true },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      created_by_user_id: { type: Sequelize.INTEGER, allowNull: true },
    };
    const fresh = await queryInterface.describeTable("bookings");
    for (const [name, definition] of Object.entries(fields)) {
      if (!fresh[name]) await queryInterface.addColumn("bookings", name, definition);
    }
    await queryInterface.sequelize.query(
      "UPDATE bookings SET amount_paid = CASE WHEN advance_paid > 0 THEN advance_paid WHEN payment_status = 'paid' THEN total_amount ELSE 0 END"
    );
    await queryInterface.changeColumn("bookings", "payment_status", {
      type: Sequelize.ENUM("pending", "partially_paid", "paid", "pay_at_hotel", "refunded"),
      allowNull: false,
      defaultValue: "pending",
    });
    await queryInterface.changeColumn("customers", "id_type", {
      type: Sequelize.ENUM("aadhaar", "passport", "national_id", "driving_license", "other"),
      allowNull: true,
    });
    const tables = (await queryInterface.showAllTables()).map((name) => String(typeof name === "object" ? name.tableName || name.table_name : name).toLowerCase());
    if (!tables.includes("audit_logs")) {
      await queryInterface.createTable("audit_logs", {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        action: { type: Sequelize.STRING(80), allowNull: false },
        entity_type: { type: Sequelize.STRING(40), allowNull: false },
        entity_id: Sequelize.INTEGER,
        actor_role: { type: Sequelize.STRING(30), allowNull: false },
        actor_id: Sequelize.INTEGER,
        metadata: Sequelize.JSON,
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("audit_logs");
    for (const field of ["created_by_user_id", "paid_at", "payment_confirmed_at", "payment_confirmed_by", "payment_mode", "razorpay_signature", "amount_paid"]) {
      await queryInterface.removeColumn("bookings", field);
    }
    await queryInterface.removeColumn("bookings", "reservation_type");
  },
};
