"use strict";

function inferModule(entityType, action) {
  const value = `${entityType || ""} ${action || ""}`.toLocaleLowerCase();
  if (value.includes("auth") || value.includes("login") || value.includes("customer")) return "auth";
  if (value.includes("booking") || value.includes("reservation")) return "booking";
  if (value.includes("payment") || value.includes("transaction") || value.includes("bill")) return "payment";
  if (value.includes("refund")) return "refund";
  if (value.includes("room")) return "rooms";
  if (value.includes("offer")) return "offers";
  if (value.includes("coupon")) return "coupon";
  if (value.includes("feedback")) return "feedback";
  return "system";
}

module.exports = {
  async up(queryInterface) {
    const tables = (await queryInterface.showAllTables()).map((table) => (
      typeof table === "string" ? table : table.tableName
    ));
    if (!tables.includes("audit_logs")) return;

    const table = await queryInterface.describeTable("audit_logs");
    if (!table.module || !table.level || !table.message) return;

    const [logs] = await queryInterface.sequelize.query(
      "SELECT id, action, entity_type, module, level, message FROM audit_logs"
    );

    for (const log of logs) {
      const module = !log.module || log.module === "system"
        ? inferModule(log.entity_type, log.action)
        : log.module;
      const action = String(log.action || "");
      const level = action.includes("failed") || action.includes("rejected")
        ? "warning"
        : log.level || "info";
      const message = log.message || action.replaceAll("_", " ");

      await queryInterface.bulkUpdate(
        "audit_logs",
        { module, level, message },
        { id: log.id }
      );
    }
  },

  async down() {
    // Data-only normalization is intentionally retained on rollback.
  },
};
