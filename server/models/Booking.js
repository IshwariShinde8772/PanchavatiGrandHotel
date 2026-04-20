const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define(
  "Booking",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    booking_ref: { type: DataTypes.STRING, unique: true },
    customer_id: { type: DataTypes.INTEGER, allowNull: false },
    room_id: { type: DataTypes.INTEGER, allowNull: false },
    check_in: { type: DataTypes.DATEONLY, allowNull: false },
    check_out: { type: DataTypes.DATEONLY, allowNull: false },
    nights: { type: DataTypes.INTEGER, allowNull: false },
    guests: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    fare_per_night: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    total_fare: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    gst_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    gst_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    extra_charges: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    special_requests: { type: DataTypes.TEXT },
    payment_method: {
      type: DataTypes.ENUM("qr", "online", "cash", "card", "upi", "pay_later"),
    },
    razorpay_order_id: { type: DataTypes.STRING },
    razorpay_payment_id: { type: DataTypes.STRING },
    payment_status: {
      type: DataTypes.ENUM("pending", "paid", "pay_at_hotel", "refunded"),
      allowNull: false,
      defaultValue: "pending",
    },
    status: {
      type: DataTypes.ENUM("pending", "confirmed", "checked_in", "checked_out", "cancelled"),
      allowNull: false,
      defaultValue: "pending",
    },
    booked_by: {
      type: DataTypes.ENUM("customer", "receptionist"),
      allowNull: false,
      defaultValue: "customer",
    },
    cancellation_reason: { type: DataTypes.TEXT },
    cancelled_at: { type: DataTypes.DATE },
    actual_checkin_time: { type: DataTypes.DATE },
    actual_checkout_time: { type: DataTypes.DATE },
    id_verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    payment_proof_url: { type: DataTypes.TEXT },
    manual_transaction_id: { type: DataTypes.STRING },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "bookings",
    timestamps: false,
  }
);
