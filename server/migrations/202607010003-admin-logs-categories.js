"use strict";

const ROOM_CATEGORIES = ["Standard", "Deluxe", "Regular"];
const LEGACY_ROOM_CATEGORIES = ["Suite", "Family", "Presidential"];

function tableNames(tables) {
  return tables.map((table) => (
    typeof table === "string" ? table : table.tableName
  ));
}

function canonicalOfferCategory(value) {
  const normalized = String(value || "").trim().toLocaleLowerCase();
  if (normalized === "all") return "All";
  if (normalized === "standard") return "Standard";
  if (normalized === "deluxe") return "Deluxe";
  if (normalized === "regular") return "Regular";
  return "Regular";
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = tableNames(await queryInterface.showAllTables());

    if (tables.includes("hotel_settings")) {
      const settings = await queryInterface.describeTable("hotel_settings");
      if (!settings.logs_enabled) {
        await queryInterface.addColumn("hotel_settings", "logs_enabled", {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        });
      }
    }

    if (tables.includes("audit_logs")) {
      const auditLogs = await queryInterface.describeTable("audit_logs");
      if (!auditLogs.level) {
        await queryInterface.addColumn("audit_logs", "level", {
          type: Sequelize.STRING(10),
          allowNull: false,
          defaultValue: "info",
        });
      }
      if (!auditLogs.module) {
        await queryInterface.addColumn("audit_logs", "module", {
          type: Sequelize.STRING(40),
          allowNull: false,
          defaultValue: "system",
        });
      }
      if (!auditLogs.message) {
        await queryInterface.addColumn("audit_logs", "message", {
          type: Sequelize.TEXT,
          allowNull: true,
        });
      }
      await queryInterface.bulkUpdate(
        "audit_logs",
        { module: "system" },
        { module: null }
      );
    }

    if (tables.includes("rooms")) {
      await queryInterface.changeColumn("rooms", "category", {
        type: Sequelize.ENUM(...ROOM_CATEGORIES, ...LEGACY_ROOM_CATEGORIES),
        allowNull: false,
      });
      await queryInterface.bulkUpdate(
        "rooms",
        { category: "Regular" },
        { category: { [Sequelize.Op.in]: LEGACY_ROOM_CATEGORIES } }
      );
      await queryInterface.changeColumn("rooms", "category", {
        type: Sequelize.ENUM(...ROOM_CATEGORIES),
        allowNull: false,
      });
    }

    if (tables.includes("offers")) {
      const [offers] = await queryInterface.sequelize.query(
        "SELECT id, room_category FROM offers"
      );
      for (const offer of offers) {
        const category = canonicalOfferCategory(offer.room_category);
        if (category !== offer.room_category) {
          await queryInterface.bulkUpdate(
            "offers",
            { room_category: category },
            { id: offer.id }
          );
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const tables = tableNames(await queryInterface.showAllTables());

    if (tables.includes("rooms")) {
      await queryInterface.changeColumn("rooms", "category", {
        type: Sequelize.ENUM(...ROOM_CATEGORIES, ...LEGACY_ROOM_CATEGORIES),
        allowNull: false,
      });
    }

    if (tables.includes("audit_logs")) {
      const auditLogs = await queryInterface.describeTable("audit_logs");
      if (auditLogs.message) await queryInterface.removeColumn("audit_logs", "message");
      if (auditLogs.module) await queryInterface.removeColumn("audit_logs", "module");
      if (auditLogs.level) await queryInterface.removeColumn("audit_logs", "level");
    }

    if (tables.includes("hotel_settings")) {
      const settings = await queryInterface.describeTable("hotel_settings");
      if (settings.logs_enabled) {
        await queryInterface.removeColumn("hotel_settings", "logs_enabled");
      }
    }
  },
};
