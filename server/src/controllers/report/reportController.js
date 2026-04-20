const { Booking } = require("../../../models");
const { getMonthlyReport, getRevenueSeries } = require("../../services/reportService");
const { toCsv } = require("../../utils/csvExport");

async function getReport(req, res) {
  const now = new Date();
  const year = Number(req.query.year || now.getUTCFullYear());
  const month = Number(req.query.month || now.getUTCMonth() + 1);

  const [summary, revenueSeries] = await Promise.all([
    getMonthlyReport(year, month),
    getRevenueSeries(),
  ]);

  return res.json({
    success: true,
    data: {
      summary,
      revenueSeries,
    },
  });
}

async function exportBookingsCsv(req, res) {
  const bookings = await Booking.findAll({ raw: true });
  const csv = toCsv(bookings);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=bookings.csv");
  return res.send(csv);
}

module.exports = {
  getReport,
  exportBookingsCsv,
};

