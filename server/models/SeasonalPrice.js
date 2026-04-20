const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define(
  "SeasonalPrice",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    category: {
      type: DataTypes.ENUM("Standard", "Deluxe", "Suite", "Family", "Presidential"),
      allowNull: false,
    },
    seasonal_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    start_date: { type: DataTypes.DATEONLY, allowNull: false },
    end_date: { type: DataTypes.DATEONLY, allowNull: false },
  },
  {
    tableName: "seasonal_prices",
    timestamps: false,
  }
);
