const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define(
  "Task",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    staff_id: { type: DataTypes.INTEGER, allowNull: false },
    room_id: { type: DataTypes.INTEGER },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    room_number: { type: DataTypes.STRING },
    task_type: {
      type: DataTypes.ENUM("cleaning", "service", "delivery", "inspection", "maintenance"),
      allowNull: false,
    },
    priority: {
      type: DataTypes.ENUM("low", "normal", "high"),
      allowNull: false,
      defaultValue: "normal",
    },
    status: {
      type: DataTypes.ENUM("pending", "in_progress", "done"),
      allowNull: false,
      defaultValue: "pending",
    },
    due_time: { type: DataTypes.DATE },
    completed_at: { type: DataTypes.DATE },
    notes: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "tasks",
    timestamps: false,
  }
);
