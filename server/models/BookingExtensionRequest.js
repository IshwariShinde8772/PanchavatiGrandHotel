const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define(
  "BookingExtensionRequest",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    booking_id: { type: DataTypes.INTEGER, allowNull: false },
    customer_id: { type: DataTypes.INTEGER, allowNull: false },
    requested_from: { type: DataTypes.DATEONLY, allowNull: false },
    requested_to: { type: DataTypes.DATEONLY, allowNull: false },
    nights: { type: DataTypes.INTEGER, allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: false },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "completed"),
      allowNull: false,
      defaultValue: "pending",
    },
    payment_method: {
      type: DataTypes.ENUM("cash", "qr"),
      allowNull: true,
    },
    payment_status: {
      type: DataTypes.ENUM("pending", "paid"),
      allowNull: false,
      defaultValue: "pending",
    },
    extra_fare: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    extra_gst: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    extra_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    response_text: { type: DataTypes.TEXT },
    processed_by_staff_id: { type: DataTypes.INTEGER },
    requested_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    responded_at: { type: DataTypes.DATE },
    completed_at: { type: DataTypes.DATE },
  },
  {
    tableName: "booking_extension_requests",
    timestamps: false,
  }
);
