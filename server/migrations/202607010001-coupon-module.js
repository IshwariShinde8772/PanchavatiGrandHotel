"use strict";

async function addColumnIfMissing(queryInterface, tableName, table, columnName, definition) {
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
    table[columnName] = definition;
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const existingTables = await queryInterface.showAllTables();
    const normalizedTables = existingTables.map((table) => (
      typeof table === "string" ? table : table.tableName
    ));

    if (!normalizedTables.includes("coupons")) {
      await queryInterface.createTable("coupons", {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        code: { type: Sequelize.STRING(64), allowNull: false, unique: true },
        title: { type: Sequelize.STRING, allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        discount_type: {
          type: Sequelize.ENUM("percentage", "fixed"),
          allowNull: false,
        },
        discount_value: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        max_discount_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
        min_booking_amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
        },
        valid_from: { type: Sequelize.DATEONLY, allowNull: false },
        valid_till: { type: Sequelize.DATEONLY, allowNull: false },
        eligibility_type: {
          type: Sequelize.ENUM(
            "all_customers",
            "first_time_customers",
            "existing_customers",
            "selected_customers"
          ),
          allowNull: false,
          defaultValue: "all_customers",
        },
        eligible_customer_ids: {
          type: Sequelize.JSON,
          allowNull: false,
          defaultValue: [],
        },
        applicable_scope: {
          type: Sequelize.ENUM("all_rooms", "selected_rooms", "selected_room_types"),
          allowNull: false,
          defaultValue: "all_rooms",
        },
        applicable_room_ids: {
          type: Sequelize.JSON,
          allowNull: false,
          defaultValue: [],
        },
        applicable_room_type_ids: {
          type: Sequelize.JSON,
          allowNull: false,
          defaultValue: [],
        },
        can_combine_with_offers: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        total_usage_limit: { type: Sequelize.INTEGER, allowNull: true },
        per_user_usage_limit: { type: Sequelize.INTEGER, allowNull: true },
        used_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        status: {
          type: Sequelize.ENUM("active", "inactive", "expired"),
          allowNull: false,
          defaultValue: "active",
        },
        created_by_admin_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "admins", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      });
      await queryInterface.addIndex("coupons", ["status", "valid_from", "valid_till"], {
        name: "coupons_status_validity_idx",
      });
    }

    const booking = await queryInterface.describeTable("bookings");
    await addColumnIfMissing(queryInterface, "bookings", booking, "offer_discount_amount", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await addColumnIfMissing(queryInterface, "bookings", booking, "amount_after_offer", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await addColumnIfMissing(queryInterface, "bookings", booking, "coupon_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "coupons", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await addColumnIfMissing(queryInterface, "bookings", booking, "applied_coupon_code", {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, "bookings", booking, "coupon_discount_amount", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await addColumnIfMissing(queryInterface, "bookings", booking, "final_payable_amount", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });

    const bill = await queryInterface.describeTable("bills");
    await addColumnIfMissing(queryInterface, "bills", bill, "base_amount", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await addColumnIfMissing(queryInterface, "bills", bill, "offer_discount_amount", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await addColumnIfMissing(queryInterface, "bills", bill, "amount_after_offer", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await addColumnIfMissing(queryInterface, "bills", bill, "applied_coupon_code", {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, "bills", bill, "coupon_discount_amount", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await addColumnIfMissing(queryInterface, "bills", bill, "final_payable_amount", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });

    if (!normalizedTables.includes("coupon_usages")) {
      await queryInterface.createTable("coupon_usages", {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        coupon_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "coupons", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        coupon_code: { type: Sequelize.STRING(64), allowNull: false },
        customer_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "customers", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        booking_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          unique: true,
          references: { model: "bookings", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        discount_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        booking_amount_before_coupon: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        final_amount_after_coupon: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        used_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
        payment_status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: "paid" },
        booking_status: { type: Sequelize.STRING(30), allowNull: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      });
      await queryInterface.addIndex("coupon_usages", ["coupon_id", "customer_id"], {
        name: "coupon_usages_coupon_customer_idx",
      });
      await queryInterface.addIndex("coupon_usages", ["coupon_id", "booking_status"], {
        name: "coupon_usages_coupon_booking_status_idx",
      });
    }
  },

  async down(queryInterface) {
    const existingTables = await queryInterface.showAllTables();
    const normalizedTables = existingTables.map((table) => (
      typeof table === "string" ? table : table.tableName
    ));

    if (normalizedTables.includes("coupon_usages")) {
      await queryInterface.dropTable("coupon_usages");
    }

    for (const [tableName, columns] of Object.entries({
      bills: [
        "final_payable_amount",
        "coupon_discount_amount",
        "applied_coupon_code",
        "amount_after_offer",
        "offer_discount_amount",
        "base_amount",
      ],
      bookings: [
        "final_payable_amount",
        "coupon_discount_amount",
        "applied_coupon_code",
        "coupon_id",
        "amount_after_offer",
        "offer_discount_amount",
      ],
    })) {
      const table = await queryInterface.describeTable(tableName);
      for (const column of columns) {
        if (table[column]) await queryInterface.removeColumn(tableName, column);
      }
    }

    if (normalizedTables.includes("coupons")) {
      await queryInterface.dropTable("coupons");
    }
  },
};
