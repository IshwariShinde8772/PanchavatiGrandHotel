const { AuditLog, HotelSetting } = require("../../models");
const { formatToIST } = require("../utils/dateHelpers");

let cachedLogsEnabled = null;
let cacheExpiresAt = 0;

function inferModule(entityType) {
  const value = String(entityType || "system").toLocaleLowerCase();
  if (value.includes("auth") || value.includes("customer")) return "auth";
  if (value.includes("booking") || value.includes("reservation")) return "booking";
  if (value.includes("payment") || value.includes("transaction") || value.includes("bill")) return "payment";
  if (value.includes("refund")) return "refund";
  if (value.includes("room")) return "rooms";
  if (value.includes("offer")) return "offers";
  if (value.includes("coupon")) return "coupon";
  if (value.includes("feedback")) return "feedback";
  return value.replace(/[^a-z0-9_-]/g, "_").slice(0, 40) || "system";
}

async function isLogSavingEnabled() {
  if (cachedLogsEnabled !== null && Date.now() < cacheExpiresAt) {
    return cachedLogsEnabled;
  }

  if (!HotelSetting?.findByPk) return true;

  try {
    const settings = await HotelSetting.findByPk(1, { attributes: ["logs_enabled"] });
    cachedLogsEnabled = settings?.logs_enabled !== false;
    cacheExpiresAt = Date.now() + 30_000;
    return cachedLogsEnabled;
  } catch (error) {
    console.warn("Unable to read log persistence setting", { error: error.message });
    return true;
  }
}

function setLogSavingEnabled(enabled) {
  cachedLogsEnabled = Boolean(enabled);
  cacheExpiresAt = Date.now() + 30_000;
}

function resetLogSettingCache() {
  cachedLogsEnabled = null;
  cacheExpiresAt = 0;
}

async function writeAudit({
  action,
  entityType,
  entityId,
  actor,
  metadata,
  transaction,
  level = "info",
  module,
  message,
}) {
  if (!AuditLog?.create) return null;
  if (!await isLogSavingEnabled()) return null;

  try {
    const timestamp = new Date();
    return await AuditLog.create({
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      actor_role: actor?.role || "system",
      actor_id: actor?.id || null,
      level: ["info", "warning", "error"].includes(level) ? level : "info",
      module: module || inferModule(entityType),
      message: message || String(action || "").replaceAll("_", " "),
      metadata: {
        ...(metadata || {}),
        actorName: metadata?.actorName || actor?.name || null,
        actorEmail: metadata?.actorEmail || actor?.email || null,
        timestampUTC: metadata?.timestampUTC || timestamp.toISOString(),
        timestampIST: metadata?.timestampIST || formatToIST(timestamp),
      },
      created_at: timestamp,
    }, { transaction });
  } catch (error) {
    console.warn("Audit log write failed", { action, entityType, entityId, error: error.message });
    return null;
  }
}

module.exports = {
  inferModule,
  isLogSavingEnabled,
  resetLogSettingCache,
  setLogSavingEnabled,
  writeAudit,
};
