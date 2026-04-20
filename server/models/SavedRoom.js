const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define(
  "SavedRoom",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    customer_id: { type: DataTypes.INTEGER, allowNull: false },
    room_id: { type: DataTypes.INTEGER, allowNull: false },
    saved_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "saved_rooms",
    timestamps: false,
  }
);

