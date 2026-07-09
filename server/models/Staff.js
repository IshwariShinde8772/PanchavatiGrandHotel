const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define(
  "Staff",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    full_name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, unique: true },
    phone: { type: DataTypes.STRING, allowNull: false },
    role: {
      type: DataTypes.ENUM("receptionist", "housekeeping", "kitchen", "server", "waiter", "manager", "admin_staff"),
      allowNull: false,
    },
    specific_role: { type: DataTypes.STRING },
    address: { type: DataTypes.TEXT },
    gender: { type: DataTypes.ENUM("male", "female", "other") },
    joining_date: { type: DataTypes.DATEONLY },
    shift: { type: DataTypes.STRING },
    id_proof_type: { type: DataTypes.STRING },
    id_proof_url: { type: DataTypes.TEXT },
    id_proof_public_id: { type: DataTypes.STRING },
    created_by_staff_id: { type: DataTypes.INTEGER },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    resetPasswordToken: { type: DataTypes.STRING, field: "reset_password_token" },
    resetPasswordExpires: { type: DataTypes.DATE, field: "reset_password_expires" },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    avatar_url: { type: DataTypes.TEXT },
    schedule_json: { type: DataTypes.JSON, defaultValue: {} },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "staff",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

