const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define(
  "Bill",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    booking_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    bill_number: { type: DataTypes.STRING, allowNull: false, unique: true },
    cust_name: { type: DataTypes.STRING, allowNull: false },
    cust_phone: { type: DataTypes.STRING },
    cust_email: { type: DataTypes.STRING },
    room_number: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false },
    check_in: { type: DataTypes.DATEONLY, allowNull: false },
    check_out: { type: DataTypes.DATEONLY, allowNull: false },
    nights: { type: DataTypes.INTEGER, allowNull: false },
    fare_per_night: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    extra_charges: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    gst_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    gst_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    payment_method: { type: DataTypes.STRING },
    payment_status: { type: DataTypes.STRING },
    extras_json: { type: DataTypes.JSON },
    generated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "bills",
    timestamps: false,
  }
);

