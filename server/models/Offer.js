const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define(
  "Offer",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    discount_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    start_date: { type: DataTypes.DATEONLY, allowNull: false },
    end_date: { type: DataTypes.DATEONLY, allowNull: false },
    room_category: { type: DataTypes.STRING, defaultValue: "All" },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: "offers",
    timestamps: false,
  }
);
