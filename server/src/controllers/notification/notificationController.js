const { Op } = require("sequelize");
const { Notification } = require("../../../models");

const ALLOWED_TYPES = new Set(["booking", "payment", "maintenance", "task", "system", "enquiry"]);
const ADMIN_ALLOWED_TARGET_ROLES = new Set(["reception", "customer"]);

function parseBoolean(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === true || value === "true" || value === "1" || value === 1) {
    return true;
  }

  if (value === false || value === "false" || value === "0" || value === 0) {
    return false;
  }

  return undefined;
}

function normalizeText(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized || undefined;
}

function normalizeRole(value) {
  const role = normalizeText(value);
  return role ? role.toLowerCase() : undefined;
}

function parseLimit(value, fallback = 50) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), 200);
}

function parseTargetId(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { error: "target_id must be a positive integer" };
  }

  return { value: parsed };
}

function validateNotificationPayload(req, res) {
  const title = normalizeText(req.body.title);
  const message = normalizeText(req.body.message);
  const type = normalizeText(req.body.type);

  if (!title) {
    res.status(400).json({ success: false, error: "title is required" });
    return null;
  }

  if (!message) {
    res.status(400).json({ success: false, error: "message is required" });
    return null;
  }

  if (!type || !ALLOWED_TYPES.has(type)) {
    res.status(400).json({
      success: false,
      error: "type must be one of booking/payment/maintenance/task/system",
    });
    return null;
  }

  const targetIdResult = parseTargetId(req.body.target_id);
  if (targetIdResult?.error) {
    res.status(400).json({ success: false, error: targetIdResult.error });
    return null;
  }

  return {
    title,
    message,
    type,
    targetId: targetIdResult?.value,
  };
}

function buildReceptionNotificationScope(userId) {
  const id = Number(userId);

  return [
    { target_role: "all" },
    { target_role: "reception", target_id: null },
    { target_role: "receptionist", target_id: null },
    ...(Number.isInteger(id) && id > 0
      ? [
          { target_role: "reception", target_id: id },
          { target_role: "receptionist", target_id: id },
        ]
      : []),
  ];
}

async function listNotifications(req, res) {
  const where = {};

  const targetRole = normalizeRole(req.query.target_role);
  if (targetRole) {
    where.target_role = targetRole;
  }

  const type = normalizeText(req.query.type);
  if (type) {
    where.type = type;
  }

  const unreadOnly = parseBoolean(req.query.unreadOnly);
  if (unreadOnly === true) {
    where.is_read = false;
  }

  const notifications = await Notification.findAll({
    where,
    order: [["created_at", "DESC"]],
    limit: parseLimit(req.query.limit, 100),
  });

  return res.json({
    success: true,
    data: notifications,
    total: notifications.length,
    message: "Notifications fetched successfully",
  });
}

async function createNotification(req, res) {
  const targetRole = normalizeRole(req.body.target_role);
  const payload = validateNotificationPayload(req, res);
  if (!payload) {
    return undefined;
  }

  if (!targetRole) {
    return res.status(400).json({ success: false, error: "target_role is required" });
  }

  if (!ADMIN_ALLOWED_TARGET_ROLES.has(targetRole)) {
    return res.status(400).json({
      success: false,
      error: "target_role must be either reception or customer",
    });
  }

  const notification = await Notification.create({
    target_role: targetRole,
    target_id: payload.targetId,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    is_read: false,
  });

  return res.status(201).json({
    success: true,
    data: notification,
    message: "Notification created successfully",
  });
}

async function markNotificationRead(req, res) {
  const notification = await Notification.findByPk(req.params.id);
  if (!notification) {
    return res.status(404).json({ success: false, error: "Notification not found" });
  }

  if (!notification.is_read) {
    await notification.update({ is_read: true });
  }

  return res.json({
    success: true,
    data: notification,
    message: "Notification marked as read",
  });
}

async function deleteNotification(req, res) {
  const notification = await Notification.findByPk(req.params.id);
  if (!notification) {
    return res.status(404).json({ success: false, error: "Notification not found" });
  }

  await notification.destroy();
  return res.json({
    success: true,
    data: { id: Number(req.params.id) },
    message: "Notification deleted successfully",
  });
}

async function listReceptionNotifications(req, res) {
  const where = {
    [Op.or]: buildReceptionNotificationScope(req.user?.id),
  };

  const type = normalizeText(req.query.type);
  if (type) {
    where.type = type;
  }

  const unreadOnly = parseBoolean(req.query.unreadOnly);
  if (unreadOnly === true) {
    where.is_read = false;
  }

  const notifications = await Notification.findAll({
    where,
    order: [["created_at", "DESC"]],
    limit: parseLimit(req.query.limit, 100),
  });

  return res.json({
    success: true,
    data: notifications,
    total: notifications.length,
    message: "Notifications fetched successfully",
  });
}

async function createReceptionNotification(req, res) {
  const targetRole = normalizeRole(req.body.target_role || "customer");
  const payload = validateNotificationPayload(req, res);
  if (!payload) {
    return undefined;
  }

  if (targetRole !== "customer") {
    return res.status(400).json({
      success: false,
      error: "target_role must be customer",
    });
  }

  const notification = await Notification.create({
    target_role: "customer",
    target_id: payload.targetId,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    is_read: false,
  });

  return res.status(201).json({
    success: true,
    data: notification,
    message: "Notification sent to customer successfully",
  });
}

async function markReceptionNotificationRead(req, res) {
  const notification = await Notification.findOne({
    where: {
      id: Number(req.params.id),
      [Op.or]: buildReceptionNotificationScope(req.user?.id),
    },
  });

  if (!notification) {
    return res.status(404).json({ success: false, error: "Notification not found" });
  }

  if (!notification.is_read) {
    await notification.update({ is_read: true });
  }

  return res.json({
    success: true,
    data: notification,
    message: "Notification marked as read",
  });
}

async function deleteReceptionNotification(req, res) {
  const notification = await Notification.findOne({
    where: {
      id: Number(req.params.id),
      [Op.or]: buildReceptionNotificationScope(req.user?.id),
    },
  });

  if (!notification) {
    return res.status(404).json({ success: false, error: "Notification not found" });
  }

  await notification.destroy();
  return res.json({
    success: true,
    data: { id: Number(req.params.id) },
    message: "Notification deleted successfully",
  });
}

module.exports = {
  listNotifications,
  createNotification,
  markNotificationRead,
  deleteNotification,
  listReceptionNotifications,
  createReceptionNotification,
  markReceptionNotificationRead,
  deleteReceptionNotification,
};
