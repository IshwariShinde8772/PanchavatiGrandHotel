const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define(
  "Notification",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    target_role: { type: DataTypes.STRING, allowNull: false },
    target_id: { type: DataTypes.INTEGER },
    title: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    type: {
      type: DataTypes.ENUM("booking", "payment", "maintenance", "task", "system"),
      allowNull: false,
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "notifications",
    timestamps: false,
  }
);

