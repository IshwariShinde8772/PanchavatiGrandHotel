const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define(
  "Enquiry",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    full_name: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING },
    check_in: { type: DataTypes.DATEONLY },
    check_out: { type: DataTypes.DATEONLY },
    adults: { type: DataTypes.INTEGER },
    enquiry_type: { type: DataTypes.STRING, allowNull: false, defaultValue: "room_booking" },
    room_category: { type: DataTypes.STRING },
    message: { type: DataTypes.TEXT, allowNull: false },
    source: { type: DataTypes.STRING, allowNull: false, defaultValue: "website" },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "new" },
    created_by_staff_id: { type: DataTypes.INTEGER },
    is_responded: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    response_text: { type: DataTypes.TEXT },
    responded_by_staff_id: { type: DataTypes.INTEGER },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "enquiries",
    timestamps: false,
  }
);

