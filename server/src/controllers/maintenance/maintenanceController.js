const { Op } = require("sequelize");
const { Booking, MaintenanceLog, Room, Staff, Task } = require("../../../models");
const { buildMaintenancePayload, serializeMaintenanceLog, STATUS_MAP, PRIORITY_MAP } = require("../../services/maintenanceService");

const maintenanceInclude = [
  { model: Room, as: "room", attributes: ["id", "room_number", "name", "status"], required: false },
  { model: Staff, as: "reporter", attributes: ["id", "full_name", "role"], required: false },
  { model: Staff, as: "assignee", attributes: ["id", "full_name", "role"], required: false },
];

async function listMaintenance(req, res) {
  const where = {};
  if (req.query.priority) {
    where.priority = PRIORITY_MAP[req.query.priority] || req.query.priority;
  }
  if (req.query.status) {
    where.status = STATUS_MAP[req.query.status] || req.query.status;
  }

  const items = await MaintenanceLog.findAll({
    where,
    include: maintenanceInclude,
    order: [["created_at", "DESC"]],
  });

  return res.json({
    success: true,
    data: items.map((item) => serializeMaintenanceLog(item)),
    total: items.length,
    page: 1,
    limit: items.length || 10,
  });
}

async function createMaintenanceLog(req, res) {
  const payload = await buildMaintenancePayload(req.body, {
    reportedByStaffId: req.user.id,
    defaultStatus: "open",
  });
  const item = await MaintenanceLog.create(payload);
  if (payload.room_id) {
    await Room.update(
      { status: "maintenance" },
      { where: { id: payload.room_id } }
    );
  }
  const created = await MaintenanceLog.findByPk(item.id, { include: maintenanceInclude });

  return res.status(201).json({
    success: true,
    data: serializeMaintenanceLog(created),
    message: "Maintenance issue reported",
  });
}

async function assignMaintenance(req, res) {
  const item = await MaintenanceLog.findByPk(req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, error: "Maintenance log not found" });
  }

  const payload = await buildMaintenancePayload(req.body, { defaultStatus: item.status });
  await item.update({
    assigned_to_staff_id: payload.assigned_to_staff_id,
    status: "in_progress",
  });
  if (item.room_id) {
    await Room.update(
      { status: "maintenance" },
      { where: { id: item.room_id } }
    );
  }
  const updated = await MaintenanceLog.findByPk(item.id, { include: maintenanceInclude });

  return res.json({
    success: true,
    data: serializeMaintenanceLog(updated),
    message: "Maintenance issue assigned",
  });
}

async function resolveMaintenance(req, res) {
  const item = await MaintenanceLog.findByPk(req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, error: "Maintenance log not found" });
  }

  await item.update({
    status: "resolved",
    resolution_note: req.body.resolution_note || req.body.resolutionNote || req.body.notes || null,
    resolved_at: new Date(),
  });

  if (item.room_id) {
    const [remainingMaintenance, activeCheckedIn, pendingCleaning] = await Promise.all([
      MaintenanceLog.count({
        where: {
          room_id: item.room_id,
          id: { [Op.ne]: item.id },
          status: { [Op.ne]: "resolved" },
        },
      }),
      Booking.count({
        where: { room_id: item.room_id, status: "checked_in" },
      }),
      Task.count({
        where: {
          room_id: item.room_id,
          task_type: "cleaning",
          status: { [Op.in]: ["pending", "in_progress"] },
        },
      }),
    ]);

    const nextRoomStatus = remainingMaintenance > 0
      ? "maintenance"
      : activeCheckedIn > 0
        ? "occupied"
        : pendingCleaning > 0
          ? "cleaning"
          : "available";
    await Room.update(
      { status: nextRoomStatus },
      { where: { id: item.room_id } }
    );
  }

  const updated = await MaintenanceLog.findByPk(item.id, { include: maintenanceInclude });

  return res.json({
    success: true,
    data: serializeMaintenanceLog(updated),
    message: "Maintenance issue resolved",
  });
}

module.exports = {
  listMaintenance,
  createMaintenanceLog,
  assignMaintenance,
  resolveMaintenance,
};
