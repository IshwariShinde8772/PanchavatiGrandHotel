const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define("AuditLog", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  action: { type: DataTypes.STRING(80), allowNull: false },
  entity_type: { type: DataTypes.STRING(40), allowNull: false },
  entity_id: { type: DataTypes.INTEGER },
  actor_role: { type: DataTypes.STRING(30), allowNull: false },
  actor_id: { type: DataTypes.INTEGER },
  level: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "info" },
  module: { type: DataTypes.STRING(40), allowNull: false, defaultValue: "system" },
  message: { type: DataTypes.TEXT },
  metadata: { type: DataTypes.JSON },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: "audit_logs", timestamps: false });
