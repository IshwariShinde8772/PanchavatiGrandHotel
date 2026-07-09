const { DataTypes } = require("sequelize");

const AMENITY_CATEGORIES = [
  "Comfort",
  "Entertainment",
  "Bathroom",
  "Food & Beverage",
  "Safety",
  "View",
  "Accessibility",
  "Other",
];

module.exports = (sequelize) => sequelize.define(
  "Amenity",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: { notEmpty: true },
    },
    icon: { type: DataTypes.STRING(80), allowNull: true },
    category: {
      type: DataTypes.ENUM(...AMENITY_CATEGORIES),
      allowNull: false,
      defaultValue: "Other",
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      allowNull: false,
      defaultValue: "active",
    },
  },
  {
    tableName: "amenities",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports.AMENITY_CATEGORIES = AMENITY_CATEGORIES;
