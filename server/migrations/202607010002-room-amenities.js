"use strict";

function normalizeLegacyAmenities(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (Buffer.isBuffer(value)) {
    return normalizeLegacyAmenities(value.toString("utf8"));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      return normalizeLegacyAmenities(JSON.parse(trimmed));
    } catch (error) {
      return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
}

function getTableNames(tables) {
  return tables.map((table) => (
    typeof table === "string" ? table : table.tableName
  ));
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableNames = getTableNames(await queryInterface.showAllTables());

    if (!tableNames.includes("amenities")) {
      await queryInterface.createTable("amenities", {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: Sequelize.STRING(100), allowNull: false, unique: true },
        icon: { type: Sequelize.STRING(80), allowNull: true },
        category: {
          type: Sequelize.ENUM(
            "Comfort",
            "Entertainment",
            "Bathroom",
            "Food & Beverage",
            "Safety",
            "View",
            "Accessibility",
            "Other"
          ),
          allowNull: false,
          defaultValue: "Other",
        },
        status: {
          type: Sequelize.ENUM("active", "inactive"),
          allowNull: false,
          defaultValue: "active",
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      });
    }

    if (!tableNames.includes("room_amenities")) {
      await queryInterface.createTable("room_amenities", {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        room_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "rooms", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        amenity_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "amenities", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      });
      await queryInterface.addIndex("room_amenities", ["room_id", "amenity_id"], {
        unique: true,
        name: "room_amenities_room_amenity_unique",
      });
      await queryInterface.addIndex("room_amenities", ["amenity_id"], {
        name: "room_amenities_amenity_idx",
      });
    }

    const [rooms] = await queryInterface.sequelize.query(
      "SELECT id, amenities FROM rooms"
    );
    const legacyByRoom = rooms.map((room) => ({
      roomId: room.id,
      names: normalizeLegacyAmenities(room.amenities),
    }));
    const uniqueNames = new Map();

    for (const room of legacyByRoom) {
      for (const name of room.names) {
        const key = name.toLocaleLowerCase();
        if (!uniqueNames.has(key)) uniqueNames.set(key, name);
      }
    }

    if (uniqueNames.size) {
      const [existingAmenities] = await queryInterface.sequelize.query(
        "SELECT id, name FROM amenities"
      );
      const existingKeys = new Set(
        existingAmenities.map((amenity) => String(amenity.name).trim().toLocaleLowerCase())
      );
      const now = new Date();
      const missing = [...uniqueNames.entries()]
        .filter(([key]) => !existingKeys.has(key))
        .map(([, name]) => ({
          name,
          icon: null,
          category: "Other",
          status: "active",
          created_at: now,
          updated_at: now,
        }));

      if (missing.length) {
        await queryInterface.bulkInsert("amenities", missing);
      }

      const [amenities] = await queryInterface.sequelize.query(
        "SELECT id, name FROM amenities"
      );
      const amenityIdByName = new Map(
        amenities.map((amenity) => [
          String(amenity.name).trim().toLocaleLowerCase(),
          amenity.id,
        ])
      );
      const [existingLinks] = await queryInterface.sequelize.query(
        "SELECT room_id, amenity_id FROM room_amenities"
      );
      const existingLinkKeys = new Set(
        existingLinks.map((link) => `${link.room_id}:${link.amenity_id}`)
      );
      const links = [];

      for (const room of legacyByRoom) {
        for (const name of room.names) {
          const amenityId = amenityIdByName.get(name.toLocaleLowerCase());
          const key = `${room.roomId}:${amenityId}`;
          if (amenityId && !existingLinkKeys.has(key)) {
            existingLinkKeys.add(key);
            links.push({
              room_id: room.roomId,
              amenity_id: amenityId,
              created_at: now,
              updated_at: now,
            });
          }
        }
      }

      if (links.length) {
        await queryInterface.bulkInsert("room_amenities", links);
      }
    }
  },

  async down(queryInterface) {
    const tableNames = getTableNames(await queryInterface.showAllTables());
    if (tableNames.includes("room_amenities")) {
      await queryInterface.dropTable("room_amenities");
    }
    if (tableNames.includes("amenities")) {
      await queryInterface.dropTable("amenities");
    }
  },
};
