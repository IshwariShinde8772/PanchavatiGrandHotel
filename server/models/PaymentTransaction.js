const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define(
  "PaymentTransaction",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    booking_id: { type: DataTypes.INTEGER, allowNull: false },
    customer_id: { type: DataTypes.INTEGER, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: "INR" },
    payment_method: {
      type: DataTypes.ENUM("qr", "online", "upi", "cash", "card", "pay_later"),
      allowNull: false,
      defaultValue: "qr",
    },
    status: {
      type: DataTypes.ENUM("pending", "paid", "expired", "cancelled", "failed"),
      allowNull: false,
      defaultValue: "pending",
    },
    upi_id: { type: DataTypes.STRING },
    qr_payload: { type: DataTypes.TEXT },
    qr_image_url: { type: DataTypes.TEXT },
    qr_expires_at: { type: DataTypes.DATE },
    payment_reference: { type: DataTypes.STRING },
    paid_at: { type: DataTypes.DATE },
    remarks: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "payment_transactions",
    timestamps: false,
  }
);
