const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define(
  "Feedback",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    customer_id: { type: DataTypes.INTEGER },
    booking_id: { type: DataTypes.INTEGER },
    room_id: { type: DataTypes.INTEGER },
    cust_name: { type: DataTypes.STRING, allowNull: false },
    rating: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING },
    comment: { type: DataTypes.TEXT, allowNull: false },
    room_category: { type: DataTypes.STRING },
    room_number: { type: DataTypes.STRING },
    room_name: { type: DataTypes.STRING },
    internal_note: { type: DataTypes.TEXT },
    source: {
      type: DataTypes.ENUM("customer", "receptionist_checkout"),
      allowNull: false,
      defaultValue: "customer",
    },
    collected_by_receptionist_id: { type: DataTypes.INTEGER },
    collected_by_receptionist_name: { type: DataTypes.STRING },
    collected_at: { type: DataTypes.DATE },
    check_in_date: { type: DataTypes.DATEONLY },
    check_out_date: { type: DataTypes.DATEONLY },
    status: {
      type: DataTypes.ENUM("pending", "published", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },
    admin_reply: { type: DataTypes.TEXT },
    photos: { type: DataTypes.JSON },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "feedbacks",
    timestamps: false,
  }
);

