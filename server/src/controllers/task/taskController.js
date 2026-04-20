const { Op } = require("sequelize");
const { Room, Staff, Task } = require("../../../models");

const assignableRoles = ["housekeeping", "receptionist", "manager"];
const taskInclude = [
  { model: Staff, as: "staff", attributes: ["id", "full_name", "email", "role", "is_active"], required: false },
  { model: Room, as: "room", attributes: ["id", "room_number", "name", "status"], required: false },
];

function normalizeText(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized || undefined;
}

function normalizeDate(value) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error("Invalid due time");
    error.status = 400;
    throw error;
  }

  return parsed;
}

function serializeTask(record) {
  const plain = typeof record?.get === "function" ? record.get({ plain: true }) : { ...record };

  return {
    ...plain,
    room_number: plain.room?.room_number || plain.room_number || null,
    room_name: plain.room?.name || null,
    room_status: plain.room?.status || null,
    assigned_to: plain.staff_id,
    assigned_to_name: plain.staff?.full_name || null,
    assigned_to_email: plain.staff?.email || null,
    assigned_to_role: plain.staff?.role || null,
  };
}

async function resolveRoom(payload = {}) {
  const roomId = payload.room_id ?? payload.roomId;
  if (roomId === undefined || roomId === null || roomId === "") {
    return null;
  }

  const room = await Room.findByPk(Number(roomId));
  if (!room) {
    const error = new Error("Room not found");
    error.status = 404;
    throw error;
  }

  return room;
}

async function resolveAssignee(staffId) {
  const assignee = await Staff.findOne({
    where: {
      id: Number(staffId),
      is_active: true,
      role: { [Op.in]: assignableRoles },
    },
  });

  if (!assignee) {
    const error = new Error("Assignable staff member not found");
    error.status = 404;
    throw error;
  }

  return assignee;
}

async function listReceptionTasks(req, res) {
  const where = {};
  if (req.query.status) {
    where.status = req.query.status;
  }
  if (req.query.task_type) {
    where.task_type = req.query.task_type;
  }
  if (req.query.priority) {
    where.priority = req.query.priority;
  }
  if (req.query.staff_id) {
    where.staff_id = Number(req.query.staff_id);
  }

  const tasks = await Task.findAll({
    where,
    include: taskInclude,
    order: [["created_at", "DESC"]],
  });

  return res.json({
    success: true,
    data: tasks.map((task) => serializeTask(task)),
    total: tasks.length,
    page: 1,
    limit: tasks.length || 10,
  });
}

async function listAssignableStaff(req, res) {
  const requestedRoles = normalizeText(req.query.roles);
  const roles = requestedRoles
    ? requestedRoles.split(",").map((role) => role.trim()).filter(Boolean)
    : assignableRoles;

  const staff = await Staff.findAll({
    where: {
      is_active: true,
      role: { [Op.in]: roles },
    },
    attributes: { exclude: ["password_hash"] },
    order: [["full_name", "ASC"]],
  });

  return res.json({
    success: true,
    data: staff,
    total: staff.length,
    page: 1,
    limit: staff.length || 10,
  });
}

async function createReceptionTask(req, res) {
  const room = await resolveRoom(req.body);
  const title = normalizeText(req.body.title);

  if (!title) {
    return res.status(400).json({ success: false, error: "Task title is required" });
  }

  const assignee = req.body.staff_id ? await resolveAssignee(req.body.staff_id) : null;
  const task = await Task.create({
    staff_id: assignee?.id || req.user.id,
    room_id: room?.id || null,
    room_number: room?.room_number || normalizeText(req.body.room_number) || null,
    title,
    description: normalizeText(req.body.description) || title,
    task_type: normalizeText(req.body.task_type) || "cleaning",
    priority: normalizeText(req.body.priority) || "normal",
    due_time: normalizeDate(req.body.due_time || req.body.dueTime),
    notes: normalizeText(req.body.notes) || null,
  });

  if (room && task.task_type === "cleaning" && room.status !== "maintenance") {
    await room.update({ status: "cleaning" });
  }

  const created = await Task.findByPk(task.id, { include: taskInclude });
  return res.status(201).json({
    success: true,
    data: serializeTask(created),
    message: "Task created successfully",
  });
}

async function assignReceptionTask(req, res) {
  const task = await Task.findByPk(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: "Task not found" });
  }

  const assignee = await resolveAssignee(req.body.staff_id || req.body.assigned_to || req.body.assigned_to_staff_id);
  await task.update({
    staff_id: assignee.id,
    status: task.status === "done" ? "pending" : task.status,
    completed_at: task.status === "done" ? null : task.completed_at,
  });

  const updated = await Task.findByPk(task.id, { include: taskInclude });
  return res.json({
    success: true,
    data: serializeTask(updated),
    message: "Task assigned successfully",
  });
}

async function updateReceptionTaskStatus(req, res) {
  const task = await Task.findByPk(req.params.id, { include: taskInclude });
  if (!task) {
    return res.status(404).json({ success: false, error: "Task not found" });
  }

  const status = normalizeText(req.body.status);
  if (!["pending", "in_progress", "done"].includes(status)) {
    return res.status(400).json({ success: false, error: "Valid task status is required" });
  }

  await task.update({
    status,
    notes: normalizeText(req.body.notes) || task.notes,
    completed_at: status === "done" ? new Date() : null,
  });

  if (task.room_id) {
    const room = task.room || await Room.findByPk(task.room_id);
    if (room && task.task_type === "cleaning" && room.status !== "maintenance") {
      await room.update({ status: status === "done" ? "available" : "cleaning" });
    }
  }

  const updated = await Task.findByPk(task.id, { include: taskInclude });
  return res.json({
    success: true,
    data: serializeTask(updated),
    message: "Task updated successfully",
  });
}

module.exports = {
  assignReceptionTask,
  createReceptionTask,
  listAssignableStaff,
  listReceptionTasks,
  updateReceptionTaskStatus,
};
