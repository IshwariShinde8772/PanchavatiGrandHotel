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
      type: DataTypes.ENUM("qr", "online", "upi", "cash", "card", "pay_later", "other"),
      allowNull: false,
      defaultValue: "qr",
    },
    status: {
      type: DataTypes.ENUM("pending", "paid", "expired", "cancelled", "failed"),
      allowNull: false,
      defaultValue: "pending",
    },
    upi_id: { type: DataTypes.STRING },
    razorpay_qr_id: { type: DataTypes.STRING },
    razorpay_order_id: { type: DataTypes.STRING, unique: true },
    razorpay_payment_id: { type: DataTypes.STRING, unique: true },
    razorpay_signature: { type: DataTypes.STRING },
    payment_type: {
      type: DataTypes.ENUM("full_booking", "reservation_advance", "reservation_balance", "extension_payment"),
      allowNull: false,
      defaultValue: "full_booking",
    },
    extension_request_id: { type: DataTypes.INTEGER },
    confirmed_by_user_id: { type: DataTypes.INTEGER },
    confirmed_by_role: { type: DataTypes.STRING(30) },
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
