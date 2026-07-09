const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define(
  "Room",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    room_number: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    category: {
      type: DataTypes.ENUM("Standard", "Deluxe", "Regular"),
      allowNull: false,
    },
    description: { type: DataTypes.TEXT, allowNull: false },
    base_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    seasonal_price: { type: DataTypes.DECIMAL(10, 2) },
    seasonal_start: { type: DataTypes.DATEONLY },
    seasonal_end: { type: DataTypes.DATEONLY },
    discount_pct: { type: DataTypes.DECIMAL(5, 2) },
    discount_start: { type: DataTypes.DATEONLY },
    discount_end: { type: DataTypes.DATEONLY },
    total_units: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    capacity: { type: DataTypes.INTEGER, allowNull: false },
    amenities: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    images: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    floor: { type: DataTypes.INTEGER },
    view_type: { type: DataTypes.STRING },
    bed_type: { type: DataTypes.STRING, defaultValue: "King" },
    size_sqm: { type: DataTypes.INTEGER, defaultValue: 28 },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    status: {
      type: DataTypes.ENUM("available", "occupied", "maintenance", "cleaning"),
      allowNull: false,
      defaultValue: "available",
    },
    nashik_landmark: { type: DataTypes.STRING },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "rooms",
    timestamps: false,
  }
);

