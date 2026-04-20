const { fn, col, Op } = require("sequelize");
const { Booking, Room } = require("../../models");

async function getMonthlyReport(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const bookings = await Booking.findAll({
    where: {
      created_at: { [Op.between]: [start, end] },
    },
    include: [{ model: Room, as: "room" }],
  });

  const totalRooms = await Room.count({ where: { is_active: true } });
  const activeBookings = bookings.filter((booking) => booking.status !== "cancelled");
  const checkedOut = bookings.filter((booking) => booking.status === "checked_out").length;
  const cancelled = bookings.filter((booking) => booking.status === "cancelled").length;
  const totalRevenue = activeBookings.reduce((sum, booking) => sum + Number(booking.total_amount), 0);
  const gstCollected = activeBookings.reduce((sum, booking) => sum + Number(booking.gst_amount), 0);
  const distinctCustomers = new Set(activeBookings.map((booking) => booking.customer_id)).size;
  const avgStayNights = activeBookings.length
    ? activeBookings.reduce((sum, booking) => sum + Number(booking.nights), 0) / activeBookings.length
    : 0;
  const occupancyRate = totalRooms
    ? (activeBookings.reduce((sum, booking) => sum + Number(booking.nights), 0) / (totalRooms * daysInMonth)) * 100
    : 0;

  const revenueByCategory = activeBookings.reduce((acc, booking) => {
    const key = booking.room?.category || "Unknown";
    acc[key] = (acc[key] || 0) + Number(booking.total_amount);
    return acc;
  }, {});

  const topCategory = Object.entries(revenueByCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    total_bookings: bookings.length,
    total_revenue: Number(totalRevenue.toFixed(2)),
    gst_collected: Number(gstCollected.toFixed(2)),
    total_customers: distinctCustomers,
    checked_out: checkedOut,
    cancelled,
    avg_stay_nights: Number(avgStayNights.toFixed(2)),
    occupancy_rate: Number(occupancyRate.toFixed(2)),
    top_category: topCategory,
    bookings_by_day: bookings.reduce((acc, booking) => {
      const key = booking.created_at.toISOString().slice(0, 10);
      acc[key] = (acc[key] || 0) + Number(booking.total_amount);
      return acc;
    }, {}),
  };
}

async function getRevenueSeries() {
  const rows = await Booking.findAll({
    attributes: [
      [fn("DATE_FORMAT", col("created_at"), "%Y-%m"), "month"],
      [fn("SUM", col("total_amount")), "revenue"],
      [fn("COUNT", col("id")), "bookings"],
    ],
    where: { status: { [Op.ne]: "cancelled" } },
    group: [fn("DATE_FORMAT", col("created_at"), "%Y-%m")],
    order: [[fn("DATE_FORMAT", col("created_at"), "%Y-%m"), "ASC"]],
    raw: true,
  });

  return rows;
}

module.exports = {
  getMonthlyReport,
  getRevenueSeries,
};
