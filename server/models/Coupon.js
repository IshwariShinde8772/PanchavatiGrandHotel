const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define(
  "Coupon",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    code: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    discount_type: {
      type: DataTypes.ENUM("percentage", "fixed"),
      allowNull: false,
    },
    discount_value: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    max_discount_amount: { type: DataTypes.DECIMAL(10, 2) },
    min_booking_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    valid_from: { type: DataTypes.DATEONLY, allowNull: false },
    valid_till: { type: DataTypes.DATEONLY, allowNull: false },
    eligibility_type: {
      type: DataTypes.ENUM(
        "all_customers",
        "first_time_customers",
        "existing_customers",
        "selected_customers"
      ),
      allowNull: false,
      defaultValue: "all_customers",
    },
    eligible_customer_ids: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    applicable_scope: {
      type: DataTypes.ENUM("all_rooms", "selected_rooms", "selected_room_types"),
      allowNull: false,
      defaultValue: "all_rooms",
    },
    applicable_room_ids: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    applicable_room_type_ids: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    can_combine_with_offers: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    total_usage_limit: { type: DataTypes.INTEGER },
    per_user_usage_limit: { type: DataTypes.INTEGER },
    used_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "expired"),
      allowNull: false,
      defaultValue: "active",
    },
    created_by_admin_id: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "coupons",
    timestamps: false,
    indexes: [
      { unique: true, fields: ["code"] },
      { fields: ["status", "valid_from", "valid_till"] },
    ],
  }
);
