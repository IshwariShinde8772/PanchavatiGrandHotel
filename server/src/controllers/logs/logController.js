const { Op } = require("sequelize");
const { AuditLog, HotelSetting } = require("../../../models");
const { getPagination } = require("../../utils/pagination");
const {
  setLogSavingEnabled,
  writeAudit,
} = require("../../services/auditService");
const env = require("../../config/env");
const {
  formatToIST,
  getTimeZoneDateRange,
} = require("../../utils/dateHelpers");

const LOG_MODULES = [
  "auth",
  "booking",
  "payment",
  "refund",
  "rooms",
  "offers",
  "coupon",
  "feedback",
  "system",
];

function dateRange(date) {
  const range = getTimeZoneDateRange(date, env.hotelTimeZone);
  if (!range) {
    return undefined;
  }
  return { [Op.gte]: range.start, [Op.lt]: range.end };
}

async function getOrCreateSettings() {
  const [settings] = await HotelSetting.findOrCreate({
    where: { id: 1 },
    defaults: {
      id: 1,
      hotel_name: "Panchavati Grand",
      logs_enabled: true,
    },
  });
  return settings;
}

async function listLogs(req, res) {
  const { page, limit, offset } = getPagination(req.query);
  const where = {};

  if (req.query.date) {
    const range = dateRange(req.query.date);
    if (range) where.created_at = range;
  }
  if (req.query.level) where.level = req.query.level;
  if (req.query.module) where.module = req.query.module;
  if (req.query.search) {
    const search = `%${req.query.search}%`;
    where[Op.or] = [
      { action: { [Op.like]: search } },
      { entity_type: { [Op.like]: search } },
      { module: { [Op.like]: search } },
      { message: { [Op.like]: search } },
    ];
  }

  const [settings, result] = await Promise.all([
    getOrCreateSettings(),
    AuditLog.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      offset,
      limit,
    }),
  ]);

  const data = result.rows.map((record) => {
    const log = record.get ? record.get({ plain: true }) : record;
    const metadata = log.metadata || {};
    const timestamp = new Date(log.created_at);
    return {
      ...log,
      actor_name: metadata.actorName || null,
      actor_email: metadata.actorEmail || null,
      ip_address: metadata.ipAddress || null,
      user_agent: metadata.userAgent || null,
      old_value: metadata.oldValue || null,
      new_value: metadata.newValue || null,
      timestamp_utc: Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString(),
      timestamp_ist: metadata.timestampIST || formatToIST(log.created_at),
    };
  });

  return res.json({
    success: true,
    data,
    logsEnabled: settings.logs_enabled !== false,
    modules: LOG_MODULES,
    total: result.count,
    page,
    limit,
    totalPages: Math.max(Math.ceil(result.count / limit), 1),
  });
}

async function updateLogStatus(req, res) {
  const settings = await getOrCreateSettings();
  await settings.update({
    logs_enabled: req.body.enabled,
    updated_at: new Date(),
  });
  setLogSavingEnabled(req.body.enabled);

  if (req.body.enabled) {
    await writeAudit({
      action: "log_saving_enabled",
      entityType: "system",
      actor: req.user,
      module: "system",
      message: "Admin enabled application log saving",
    });
  }

  return res.json({
    success: true,
    data: { logsEnabled: req.body.enabled },
    message: req.body.enabled ? "Log saving enabled" : "Log saving disabled",
  });
}

module.exports = {
  listLogs,
  updateLogStatus,
};
