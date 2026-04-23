const { Notification } = require("../../../models");

const ALLOWED_TYPES = new Set(["booking", "payment", "maintenance", "task", "system"]);

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

  const parsedLimit = Number(req.query.limit);
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.min(Math.floor(parsedLimit), 200)
    : 50;

  const notifications = await Notification.findAll({
    where,
    order: [["created_at", "DESC"]],
    limit,
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
  const title = normalizeText(req.body.title);
  const message = normalizeText(req.body.message);
  const type = normalizeText(req.body.type);
  const rawTargetId = req.body.target_id;

  if (!targetRole) {
    return res.status(400).json({ success: false, error: "target_role is required" });
  }

  if (!title) {
    return res.status(400).json({ success: false, error: "title is required" });
  }

  if (!message) {
    return res.status(400).json({ success: false, error: "message is required" });
  }

  if (!type || !ALLOWED_TYPES.has(type)) {
    return res.status(400).json({
      success: false,
      error: "type must be one of booking/payment/maintenance/task/system",
    });
  }

  let targetId;
  if (rawTargetId !== undefined && rawTargetId !== null && rawTargetId !== "") {
    targetId = Number(rawTargetId);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ success: false, error: "target_id must be a positive integer" });
    }

    if (targetRole === "all") {
      return res.status(400).json({
        success: false,
        error: "target_id is not allowed when target_role is all",
      });
    }
  }

  const notification = await Notification.create({
    target_role: targetRole,
    target_id: targetId,
    title,
    message,
    type,
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

module.exports = {
  listNotifications,
  createNotification,
  markNotificationRead,
  deleteNotification,
};
