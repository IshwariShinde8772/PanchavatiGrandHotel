const { Op } = require("sequelize");
const {
  Booking,
  Staff,
  MaintenanceLog,
  Enquiry,
  Feedback,
  Inventory,
  Room,
} = require("../../../models");
const { getRevenueSeries, getMonthlyReport } = require("../../services/reportService");

async function getAdminDashboard(req, res) {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [report, revenueSeries] = await Promise.all([
    getMonthlyReport(now.getUTCFullYear(), now.getUTCMonth() + 1),
    getRevenueSeries(),
  ]);

  const [activeStaff, openMaintenance, newEnquiries, inventory, rooms, recentBookings, pendingFeedback] = await Promise.all([
    Staff.count({ where: { is_active: true } }),
    MaintenanceLog.count({ where: { status: { [Op.ne]: "resolved" } } }),
    Enquiry.count({ where: { created_at: { [Op.gte]: monthStart } } }),
    Inventory.findAll(),
    Room.findAll(),
    Booking.findAll({ order: [["created_at", "DESC"]], limit: 10 }),
    Feedback.count({ where: { status: "pending" } }),
  ]);

  const lowStockItems = inventory.filter((item) => item.quantity <= item.reorder_level);
  const occupancy = rooms.reduce((acc, room) => {
    acc[room.status] = (acc[room.status] || 0) + 1;
    return acc;
  }, {});

  return res.json({
    success: true,
    data: {
      stats: {
        total_revenue: report.total_revenue,
        total_bookings: report.total_bookings,
        occupancy_rate: report.occupancy_rate,
        active_staff: activeStaff,
        open_maintenance: openMaintenance,
        new_enquiries: newEnquiries,
      },
      revenueSeries,
      occupancy,
      recentBookings,
      alerts: {
        low_inventory: lowStockItems,
        open_maintenance: openMaintenance,
        pending_feedback: pendingFeedback,
        pay_at_hotel_today: await Booking.count({
          where: {
            payment_status: "pay_at_hotel",
            check_in: now.toISOString().slice(0, 10),
          },
        }),
      },
    },
  });
}

module.exports = { getAdminDashboard };

