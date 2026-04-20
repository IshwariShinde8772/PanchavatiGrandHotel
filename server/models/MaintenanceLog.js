const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define(
  "MaintenanceLog",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    room_id: { type: DataTypes.INTEGER },
    reported_by_staff_id: { type: DataTypes.INTEGER, allowNull: false },
    assigned_to_staff_id: { type: DataTypes.INTEGER },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    priority: {
      type: DataTypes.ENUM("low", "medium", "high", "urgent"),
      allowNull: false,
      defaultValue: "medium",
    },
    status: {
      type: DataTypes.ENUM("open", "in_progress", "resolved"),
      allowNull: false,
      defaultValue: "open",
    },
    image_url: { type: DataTypes.TEXT },
    resolution_note: { type: DataTypes.TEXT },
    resolved_at: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "maintenance_logs",
    timestamps: false,
  }
);

