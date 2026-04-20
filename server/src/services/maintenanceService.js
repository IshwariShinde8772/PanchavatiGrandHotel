const { Room } = require("../../models");

const PRIORITY_MAP = {
  low: "low",
  Low: "low",
  medium: "medium",
  Medium: "medium",
  high: "high",
  High: "high",
  urgent: "urgent",
  Urgent: "urgent",
};

const STATUS_MAP = {
  open: "open",
  Open: "open",
  pending: "open",
  Pending: "open",
  in_progress: "in_progress",
  "In Progress": "in_progress",
  resolved: "resolved",
  Resolved: "resolved",
};

function normalizeText(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized || undefined;
}

function normalizeEnumValue(value, map, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return map[value] || fallback;
}

async function resolveRoomId(payload = {}) {
  const explicitRoomId = payload.room_id ?? payload.roomId;
  if (explicitRoomId !== undefined && explicitRoomId !== null && explicitRoomId !== "") {
    return Number(explicitRoomId);
  }

  const roomNumber = normalizeText(payload.room_number ?? payload.roomNumber);
  if (!roomNumber) {
    return null;
  }

  const room = await Room.findOne({ where: { room_number: roomNumber } });
  if (!room) {
    const error = new Error("Room not found for the provided room number");
    error.status = 404;
    throw error;
  }

  return room.id;
}

async function buildMaintenancePayload(payload = {}, options = {}) {
  const roomId = await resolveRoomId(payload);
  const title = normalizeText(payload.title ?? payload.issue_title ?? payload.issueTitle);

  if (!title) {
    const error = new Error("Issue title is required");
    error.status = 400;
    throw error;
  }

  const description = normalizeText(payload.description) || title;
  const imageUrl = normalizeText(payload.image_url ?? payload.photo_url ?? payload.imageUrl);
  const resolutionNote = normalizeText(payload.resolution_note ?? payload.resolutionNote);
  const assignedTo =
    payload.assigned_to_staff_id ??
    payload.assigned_to ??
    payload.assignedToStaffId;

  return Object.fromEntries(
    Object.entries({
      room_id: roomId,
      reported_by_staff_id: options.reportedByStaffId,
      assigned_to_staff_id: assignedTo !== undefined && assignedTo !== null && assignedTo !== ""
        ? Number(assignedTo)
        : undefined,
      title,
      description,
      priority: normalizeEnumValue(payload.priority, PRIORITY_MAP, options.defaultPriority || "medium"),
      status: normalizeEnumValue(payload.status, STATUS_MAP, options.defaultStatus || "open"),
      image_url: imageUrl,
      resolution_note: resolutionNote,
    }).filter(([, value]) => value !== undefined)
  );
}

function serializeMaintenanceLog(record) {
  const plain = typeof record?.get === "function" ? record.get({ plain: true }) : { ...record };

  return {
    ...plain,
    issue_title: plain.title,
    photo_url: plain.image_url,
    room_number: plain.room?.room_number || plain.room_number || null,
    room_name: plain.room?.name || null,
    reported_by: plain.reported_by_staff_id,
    reported_by_name: plain.reporter?.full_name || null,
    assigned_to: plain.assigned_to_staff_id,
    assigned_to_name: plain.assignee?.full_name || null,
  };
}

module.exports = {
  buildMaintenancePayload,
  serializeMaintenanceLog,
  STATUS_MAP,
  PRIORITY_MAP,
};
