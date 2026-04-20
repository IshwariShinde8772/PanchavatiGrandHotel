const { Task, MaintenanceLog, Staff } = require("../../../models");
const { buildMaintenancePayload, serializeMaintenanceLog } = require("../../services/maintenanceService");

async function getMyTasks(req, res) {
  const tasks = await Task.findAll({
    where: { staff_id: req.user.id },
    order: [["due_time", "ASC"]],
  });

  return res.json({
    success: true,
    data: tasks,
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

  await task.update({
    status: req.body.status,
    notes: req.body.notes || task.notes,
    completed_at: req.body.status === "done" ? new Date() : task.completed_at,
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
