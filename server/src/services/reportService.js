const { Op, fn, col } = require("sequelize");
const { Booking, Customer, Room } = require("../../models");

const ROOM_STATUS_KEYS = ["available", "occupied", "cleaning", "maintenance"];

function ensureDate(value, label) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error(`Invalid ${label}`);
    error.status = 400;
    throw error;
  }

  return parsed;
}

function dateOnly(value) {
  return value.toISOString().slice(0, 10);
}

function normalizeFilters(rawFilters = {}) {
  const now = new Date();
  const year = Number(rawFilters.year || now.getUTCFullYear());
  const month = Number(rawFilters.month || now.getUTCMonth() + 1);

  if (!Number.isInteger(year) || year < 2000 || year > 3000) {
    const error = new Error("year must be a valid 4-digit year");
    error.status = 400;
    throw error;
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    const error = new Error("month must be between 1 and 12");
    error.status = 400;
    throw error;
  }

  const parsedFrom = ensureDate(rawFilters.dateFrom, "dateFrom");
  const parsedTo = ensureDate(rawFilters.dateTo, "dateTo");

  const dateFrom = parsedFrom
    ? new Date(Date.UTC(parsedFrom.getUTCFullYear(), parsedFrom.getUTCMonth(), parsedFrom.getUTCDate(), 0, 0, 0, 0))
    : new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const dateTo = parsedTo
    ? new Date(Date.UTC(parsedTo.getUTCFullYear(), parsedTo.getUTCMonth(), parsedTo.getUTCDate(), 23, 59, 59, 999))
    : new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  if (dateFrom > dateTo) {
    const error = new Error("dateFrom must be earlier than or equal to dateTo");
    error.status = 400;
    throw error;
  }

  const category = rawFilters.category ? String(rawFilters.category).trim() : undefined;
  const status = rawFilters.status ? String(rawFilters.status).trim() : undefined;

  return {
    year,
    month,
    dateFrom,
    dateTo,
    category: category || undefined,
    status: status || undefined,
  };
}

function buildBookingQuery(filters) {
  const where = {
    created_at: {
      [Op.between]: [filters.dateFrom, filters.dateTo],
    },
  };

  if (filters.status) {
    where.status = filters.status;
  }

  const roomWhere = filters.category ? { category: filters.category } : undefined;
  return { where, roomWhere };
}

function sumBy(items, mapper) {
  return items.reduce((acc, item) => acc + Number(mapper(item) || 0), 0);
}

function mapToSortedSeries(source) {
  return Object.entries(source)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, value]) => ({
      period,
      ...value,
    }));
}

function buildStatusSummary(bookings) {
  const output = {};
  for (const booking of bookings) {
    output[booking.status] = (output[booking.status] || 0) + 1;
  }

  return Object.entries(output)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({ status, count }));
}

async function getOccupancySnapshot(filters) {
  const where = filters.category ? { category: filters.category } : undefined;
  const rows = await Room.findAll({
    attributes: ["status", [fn("COUNT", col("id")), "count"]],
    where,
    group: ["status"],
    raw: true,
  });

  const occupancy = ROOM_STATUS_KEYS.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});

  for (const row of rows) {
    occupancy[row.status] = Number(row.count);
  }

  return occupancy;
}

async function getFilteredBookings(filters) {
  const { where, roomWhere } = buildBookingQuery(filters);
  return Booking.findAll({
    where,
    include: [
      {
        model: Room,
        as: "room",
        where: roomWhere,
        required: Boolean(roomWhere),
      },
      {
        model: Customer,
        as: "customer",
        required: false,
      },
    ],
    order: [["created_at", "ASC"]],
  });
}

async function getReport(filtersInput = {}) {
  const filters = normalizeFilters(filtersInput);
  const bookings = await getFilteredBookings(filters);
  const occupancy = await getOccupancySnapshot(filters);

  const revenueBookings = bookings.filter((booking) => booking.status !== "cancelled");
  const totalRooms = await Room.count({
    where: filters.category ? { category: filters.category, is_active: true } : { is_active: true },
  });
  const totalDays = Math.max(
    1,
    Math.round((filters.dateTo.getTime() - filters.dateFrom.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  const revenueSeriesMap = {};
  for (const booking of revenueBookings) {
    const key = dateOnly(new Date(booking.created_at));
    if (!revenueSeriesMap[key]) {
      revenueSeriesMap[key] = { revenue: 0, bookings: 0 };
    }
    revenueSeriesMap[key].revenue += Number(booking.total_amount || 0);
    revenueSeriesMap[key].bookings += 1;
  }

  const categoryRevenueMap = {};
  for (const booking of revenueBookings) {
    const category = booking.room?.category || "Unknown";
    if (!categoryRevenueMap[category]) {
      categoryRevenueMap[category] = { category, revenue: 0, bookings: 0 };
    }
    categoryRevenueMap[category].revenue += Number(booking.total_amount || 0);
    categoryRevenueMap[category].bookings += 1;
  }

  const totalNights = sumBy(revenueBookings, (booking) => booking.nights);
  const occupancyRate = totalRooms ? (totalNights / (totalRooms * totalDays)) * 100 : 0;
  const distinctCustomers = new Set(revenueBookings.map((booking) => booking.customer_id)).size;
  const avgStayNights = revenueBookings.length ? totalNights / revenueBookings.length : 0;

  const revenueByCategory = Object.values(categoryRevenueMap)
    .sort((a, b) => b.revenue - a.revenue)
    .map((item) => ({
      ...item,
      revenue: Number(item.revenue.toFixed(2)),
    }));

  return {
    summary: {
      total_bookings: bookings.length,
      total_revenue: Number(sumBy(revenueBookings, (booking) => booking.total_amount).toFixed(2)),
      gst_collected: Number(sumBy(revenueBookings, (booking) => booking.gst_amount).toFixed(2)),
      total_customers: distinctCustomers,
      checked_out: bookings.filter((booking) => booking.status === "checked_out").length,
      cancelled: bookings.filter((booking) => booking.status === "cancelled").length,
      avg_stay_nights: Number(avgStayNights.toFixed(2)),
      occupancy_rate: Number(occupancyRate.toFixed(2)),
      date_from: dateOnly(filters.dateFrom),
      date_to: dateOnly(filters.dateTo),
    },
    revenueSeries: mapToSortedSeries(revenueSeriesMap).map((entry) => ({
      ...entry,
      revenue: Number(entry.revenue.toFixed(2)),
    })),
    revenueByCategory,
    bookingsByStatus: buildStatusSummary(bookings),
    occupancy,
    filters: {
      year: filters.year,
      month: filters.month,
      dateFrom: dateOnly(filters.dateFrom),
      dateTo: dateOnly(filters.dateTo),
      category: filters.category || null,
      status: filters.status || null,
    },
  };
}

async function getReportCsvRows(filtersInput = {}) {
  const filters = normalizeFilters(filtersInput);
  const bookings = await getFilteredBookings(filters);

  return bookings.map((booking) => ({
    booking_ref: booking.booking_ref,
    status: booking.status,
    payment_status: booking.payment_status,
    booked_by: booking.booked_by,
    category: booking.room?.category || "",
    room_number: booking.room?.room_number || "",
    customer_name: booking.customer?.full_name || "",
    customer_phone: booking.customer?.phone || "",
    check_in: booking.check_in,
    check_out: booking.check_out,
    nights: booking.nights,
    total_amount: Number(booking.total_amount || 0).toFixed(2),
    created_at: booking.created_at,
  }));
}

module.exports = {
  getReport,
  getReportCsvRows,
  normalizeFilters,
};

