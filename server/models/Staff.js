const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define(
  "Staff",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    full_name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    phone: { type: DataTypes.STRING, allowNull: false },
    role: {
      type: DataTypes.ENUM("receptionist", "housekeeping", "kitchen", "server", "manager"),
      allowNull: false,
    },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    resetPasswordToken: { type: DataTypes.STRING, field: "reset_password_token" },
    resetPasswordExpires: { type: DataTypes.DATE, field: "reset_password_expires" },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    avatar_url: { type: DataTypes.TEXT },
    schedule_json: { type: DataTypes.JSON, defaultValue: {} },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "staff",
    timestamps: false,
  }
);

