const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define(
  "HotelSetting",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, defaultValue: 1 },
    hotel_name: { type: DataTypes.STRING, allowNull: false, defaultValue: "Panchavati Grand" },
    logo_url: { type: DataTypes.TEXT },
    gst_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 12 },
    address: { type: DataTypes.TEXT },
    phone: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    bank_name: { type: DataTypes.STRING },
    upi_id: { type: DataTypes.STRING },
    gstin_number: { type: DataTypes.STRING },
    pan_number: { type: DataTypes.STRING },
    whatsapp: { type: DataTypes.STRING },
    check_in_time: { type: DataTypes.STRING, defaultValue: "14:00" },
    check_out_time: { type: DataTypes.STRING, defaultValue: "11:00" },
    cancellation_policy_text: { type: DataTypes.TEXT },
    late_checkout_fee: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    extra_bed_charge: { type: DataTypes.DECIMAL(10, 2), defaultValue: 500 },
    logs_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "hotel_settings",
    timestamps: false,
  }
);

