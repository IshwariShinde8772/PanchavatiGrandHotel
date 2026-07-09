const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define(
  "CouponUsage",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    coupon_id: { type: DataTypes.INTEGER, allowNull: false },
    coupon_code: { type: DataTypes.STRING(64), allowNull: false },
    customer_id: { type: DataTypes.INTEGER, allowNull: false },
    booking_id: { type: DataTypes.INTEGER, allowNull: true, unique: true },
    discount_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    booking_amount_before_coupon: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    final_amount_after_coupon: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    used_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    payment_status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "paid" },
    booking_status: { type: DataTypes.STRING(30), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "coupon_usages",
    timestamps: false,
    indexes: [
      { unique: true, fields: ["booking_id"] },
      { fields: ["coupon_id", "customer_id"] },
      { fields: ["coupon_id", "booking_status"] },
    ],
  }
);
