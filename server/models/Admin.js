const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define(
  "Admin",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    resetPasswordToken: { type: DataTypes.STRING, field: "reset_password_token" },
    resetPasswordExpires: { type: DataTypes.DATE, field: "reset_password_expires" },
    phone: { type: DataTypes.STRING },
    full_name: { type: DataTypes.STRING, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "admins",
    timestamps: false,
  }
);

