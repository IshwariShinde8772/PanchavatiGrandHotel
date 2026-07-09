const { DataTypes } = require("sequelize");

const NO_SHOW_JSON_FIELDS = {
  checkInTime: "check_in_time",
  checkInDateTime: "check_in_datetime",
  autoCancelAt: "auto_cancel_at",
  noShowGraceMinutes: "no_show_grace_minutes",
  autoCancellationReason: "auto_cancellation_reason",
  autoCancelledAt: "auto_cancelled_at",
  cancellationType: "cancellation_type",
  refundRequestCreatedAt: "refund_request_created_at",
};

module.exports = (sequelize) => {
  const Booking = sequelize.define(
    "Booking",
    {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    booking_ref: { type: DataTypes.STRING, unique: true },
    customer_id: { type: DataTypes.INTEGER, allowNull: false },
    room_id: { type: DataTypes.INTEGER, allowNull: false },
    check_in: { type: DataTypes.DATEONLY, allowNull: false },
    checkInTime: {
      type: DataTypes.STRING(5),
      allowNull: false,
      defaultValue: "14:00",
      field: "check_in_time",
    },
    checkInDateTime: { type: DataTypes.DATE, field: "check_in_datetime" },
    autoCancelAt: { type: DataTypes.DATE, field: "auto_cancel_at" },
    noShowGraceMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
      field: "no_show_grace_minutes",
    },
    check_out: { type: DataTypes.DATEONLY, allowNull: false },
    nights: { type: DataTypes.INTEGER, allowNull: false },
    guests: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    fare_per_night: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    base_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    discount_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    offer_discount_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    amount_after_offer: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    offer_id: { type: DataTypes.INTEGER },
    coupon_id: { type: DataTypes.INTEGER },
    applied_coupon_code: { type: DataTypes.STRING(64) },
    coupon_discount_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    final_payable_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    total_fare: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    gst_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    gst_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    advance_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    advance_paid: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    remaining_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    booking_type: {
      type: DataTypes.ENUM("manual", "online"),
      allowNull: false,
      defaultValue: "online",
    },
    reservation_type: {
      type: DataTypes.ENUM("confirmed_booking", "reserved_booking"),
      allowNull: false,
      defaultValue: "confirmed_booking",
    },
    checkout_token: { type: DataTypes.STRING(64), unique: true },
    amount_paid: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    extra_charges: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    special_requests: { type: DataTypes.TEXT },
    payment_method: {
      type: DataTypes.ENUM("qr", "online", "cash", "card", "upi", "pay_later"),
    },
    razorpay_order_id: { type: DataTypes.STRING },
    razorpay_payment_id: { type: DataTypes.STRING },
    razorpay_signature: { type: DataTypes.STRING },
    payment_mode: { type: DataTypes.STRING(30) },
    payment_confirmed_by: { type: DataTypes.INTEGER },
    payment_confirmed_at: { type: DataTypes.DATE },
    paid_at: { type: DataTypes.DATE },
    created_by_user_id: { type: DataTypes.INTEGER },
    payment_status: {
      type: DataTypes.ENUM("pending", "partially_paid", "paid", "failed", "pay_at_hotel", "refunded"),
      allowNull: false,
      defaultValue: "pending",
    },
    status: {
      type: DataTypes.ENUM("pending", "reserved", "confirmed", "checked_in", "checked_out", "cancelled"),
      allowNull: false,
      defaultValue: "pending",
    },
    booked_by: {
      type: DataTypes.ENUM("customer", "receptionist"),
      allowNull: false,
      defaultValue: "customer",
    },
    cancellation_reason: { type: DataTypes.TEXT },
    cancellation_charge: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    refund_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    refund_status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "not_applicable" },
    cancellation_policy_applied: { type: DataTypes.STRING(80) },
    cancellationType: { type: DataTypes.STRING(40), field: "cancellation_type" },
    autoCancellationReason: { type: DataTypes.TEXT, field: "auto_cancellation_reason" },
    autoCancelledAt: { type: DataTypes.DATE, field: "auto_cancelled_at" },
    refundRequestCreatedAt: { type: DataTypes.DATE, field: "refund_request_created_at" },
    cancelled_by: { type: DataTypes.STRING },
    cancelled_at: { type: DataTypes.DATE },
    actual_checkin_time: { type: DataTypes.DATE },
    actual_checkout_time: { type: DataTypes.DATE },
    checked_in_by_staff_id: { type: DataTypes.INTEGER },
    checked_out_by_staff_id: { type: DataTypes.INTEGER },
    checked_out_by_role: { type: DataTypes.STRING(30) },
    is_early_checkout: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    early_checkout_at: { type: DataTypes.DATE },
    early_checkout_reason: { type: DataTypes.TEXT },
    early_checkout_note: { type: DataTypes.TEXT },
    original_checkout_date: { type: DataTypes.DATEONLY },
    early_checkout_refund_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    early_checkout_adjustment_charge: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    early_checkout_policy_applied: { type: DataTypes.STRING(160) },
    room_status_after_checkout: { type: DataTypes.STRING(30) },
    id_verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    id_verification_status: {
      type: DataTypes.ENUM("pending", "verified", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },
    id_verified_by_staff_id: { type: DataTypes.INTEGER },
    id_verified_at: { type: DataTypes.DATE },
    id_verification_note: { type: DataTypes.TEXT },
    payment_proof_url: { type: DataTypes.TEXT },
    manual_transaction_id: { type: DataTypes.STRING },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "bookings",
    timestamps: false,
    }
  );

  const sequelizeToJSON = Booking.prototype.toJSON;
  Booking.prototype.toJSON = function toJSON() {
    const values = sequelizeToJSON.call(this);
    for (const [attribute, field] of Object.entries(NO_SHOW_JSON_FIELDS)) {
      values[field] = values[attribute] ?? null;
    }
    return values;
  };

  return Booking;
};
