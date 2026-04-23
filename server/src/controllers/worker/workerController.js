const { Task, MaintenanceLog, Staff, Room } = require("../../../models");
const { buildMaintenancePayload, serializeMaintenanceLog } = require("../../services/maintenanceService");

const NEXT_STATUS = {
  pending: "in_progress",
  in_progress: "done",
  done: null,
};

async function getMyTasks(req, res) {
  const tasks = await Task.findAll({
    where: { staff_id: req.user.id },
    include: [{ model: Room, as: "room", attributes: ["id", "room_number", "name"], required: false }],
    order: [["due_time", "ASC"]],
  });

  return res.json({
    success: true,
    data: tasks.map((task) => {
      const plain = task.get({ plain: true });
      return {
        ...plain,
        room_number: plain.room?.room_number || plain.room_number || null,
      };
    }),
    total: tasks.length,
    page: 1,
    limit: tasks.length || 10,
  });
}

async function updateTaskStatus(req, res) {
  const task = await Task.findOne({
    where: { id: req.params.id, staff_id: req.user.id },
  });

  if (!task) {
    return res.status(404).json({ success: false, error: "Task not found" });
  }

  const requestedStatus = req.body.status;
  if (requestedStatus && !["pending", "in_progress", "done"].includes(requestedStatus)) {
    return res.status(400).json({ success: false, error: "Invalid task status" });
  }

  if (requestedStatus && requestedStatus !== task.status) {
    const expectedNext = NEXT_STATUS[task.status];
    if (requestedStatus !== expectedNext) {
      return res.status(400).json({
        success: false,
        error: `Invalid status transition. ${task.status} can only move to ${expectedNext || "no further state"}`,
      });
    }
  }

  await task.update({
    status: requestedStatus || task.status,
    notes: req.body.notes || task.notes,
    completed_at: requestedStatus === "done" ? new Date() : task.completed_at,
  });

  return res.json({
    success: true,
    data: task,
    message: "Task updated successfully",
  });
}

async function getMySchedule(req, res) {
  const staff = await Staff.findByPk(req.user.id, {
    attributes: { exclude: ["password_hash"] },
  });

  return res.json({
    success: true,
    data: staff?.schedule_json || {},
  });
}

async function reportIssue(req, res) {
  const payload = await buildMaintenancePayload(req.body, {
    reportedByStaffId: req.user.id,
    defaultStatus: "open",
  });
  const item = await MaintenanceLog.create(payload);
  const created = await MaintenanceLog.findByPk(item.id);

  return res.status(201).json({
    success: true,
    data: serializeMaintenanceLog(created),
    message: "Issue reported successfully",
  });
}

module.exports = {
  getMyTasks,
  updateTaskStatus,
  getMySchedule,
  reportIssue,
};
