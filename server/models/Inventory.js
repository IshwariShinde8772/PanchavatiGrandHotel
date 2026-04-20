const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define(
  "Inventory",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    item_name: { type: DataTypes.STRING, allowNull: false },
    category: {
      type: DataTypes.ENUM("linen", "toiletries", "food", "cleaning", "maintenance", "beverage"),
      allowNull: false,
    },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    unit: { type: DataTypes.STRING, allowNull: false },
    reorder_level: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
    supplier: { type: DataTypes.STRING },
    cost_per_unit: { type: DataTypes.DECIMAL(10, 2) },
    last_updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_by_staff_id: { type: DataTypes.INTEGER },
  },
  {
    tableName: "inventory",
    timestamps: false,
  }
);

