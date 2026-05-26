const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define(
  "Customer",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    full_name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, unique: true },
    phone: { type: DataTypes.STRING, allowNull: true, unique: true },
    password_hash: { type: DataTypes.STRING },
    avatar_url: { type: DataTypes.TEXT },
    nationality: { type: DataTypes.STRING },
    id_type: {
      type: DataTypes.ENUM("passport", "national_id", "driving_license", "other"),
    },
    id_number: { type: DataTypes.STRING },
    id_expiry: { type: DataTypes.DATEONLY },
    id_doc_url: { type: DataTypes.TEXT },
    otp_code: { type: DataTypes.STRING },
    otp_expires_at: { type: DataTypes.DATE },
    resetPasswordToken: { type: DataTypes.STRING, field: "reset_password_token" },
    resetPasswordExpires: { type: DataTypes.DATE, field: "reset_password_expires" },
    otp_verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    is_deleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "customers",
    timestamps: false,
  }
);
