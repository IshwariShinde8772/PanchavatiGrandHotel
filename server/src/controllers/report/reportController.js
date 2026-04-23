const { getReport: buildReportData, getReportCsvRows } = require("../../services/reportService");
const { toCsv } = require("../../utils/csvExport");

async function getReport(req, res) {
  const data = await buildReportData(req.query);

  return res.json({
    success: true,
    data,
    message: "Report generated successfully",
  });
}

async function exportBookingsCsv(req, res) {
  const rows = await getReportCsvRows(req.query);
  const csv = toCsv(rows);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=bookings.csv");
  return res.send(csv);
}

module.exports = {
  getReport,
  exportBookingsCsv,
};

