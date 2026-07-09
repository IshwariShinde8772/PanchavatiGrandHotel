const { DataTypes } = require("sequelize");

module.exports = (sequelize) => sequelize.define(
  "RoomAmenity",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    room_id: { type: DataTypes.INTEGER, allowNull: false },
    amenity_id: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: "room_amenities",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["room_id", "amenity_id"],
        name: "room_amenities_room_amenity_unique",
      },
    ],
  }
);
