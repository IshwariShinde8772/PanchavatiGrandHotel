const { Op, fn, col } = require("sequelize");
const { Booking, Customer, PaymentTransaction, Room } = require("../../models");
const env = require("../config/env");
const {
  formatISTDateTimeForReport,
  getBusinessDate,
  getTimeZoneDateRange,
} = require("../utils/dateHelpers");

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

function normalizeFilters(rawFilters = {}) {
  const now = new Date();
  const businessToday = getBusinessDate(now, env.hotelTimeZone);
  const year = Number(rawFilters.year || businessToday.slice(0, 4));
  const month = Number(rawFilters.month || businessToday.slice(5, 7));

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

  if (rawFilters.dateFrom) ensureDate(rawFilters.dateFrom, "dateFrom");
  if (rawFilters.dateTo) ensureDate(rawFilters.dateTo, "dateTo");

  const defaultFrom = `${year}-${String(month).padStart(2, "0")}-01`;
  const defaultTo = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const dateFromLabel = rawFilters.dateFrom
    ? String(rawFilters.dateFrom).slice(0, 10)
    : defaultFrom;
  const dateToLabel = rawFilters.dateTo
    ? String(rawFilters.dateTo).slice(0, 10)
    : defaultTo;
  const fromRange = getTimeZoneDateRange(dateFromLabel, env.hotelTimeZone);
  const toRange = getTimeZoneDateRange(dateToLabel, env.hotelTimeZone);
  if (!fromRange || !toRange) {
    const error = new Error("Report dates must use YYYY-MM-DD format");
    error.status = 400;
    throw error;
  }
  const dateFrom = fromRange.start;
  const dateTo = new Date(toRange.end.getTime() - 1);

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
    dateFromLabel,
    dateToLabel,
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

function settledBookingRevenue(booking) {
  const pendingExtensionAmount = sumBy(
    booking.extensionRequests || [],
    (extension) => extension.payment_status === "paid"
      ? 0
      : extension.extension_remaining_amount
        ?? extension.extension_payable_amount
        ?? extension.extra_amount
  );
  return Math.max(Number(booking.total_amount || 0) - pendingExtensionAmount, 0);
}

function buildBookingReportRow(booking) {
  const isEarlyCheckout = Boolean(booking.is_early_checkout);
  const extensions = booking.extensionRequests || [];
  const latestExtension = extensions.at(-1);
  const extensionAmount = sumBy(
    extensions,
    (extension) => extension.extension_payable_amount ?? extension.extra_amount
  );
  return {
    booking_id: booking.id,
    booking_ref: booking.booking_ref,
    customer_name: booking.customer?.full_name || "",
    customer_phone: booking.customer?.phone || "",
    room_number: booking.room?.room_number || "",
    category: booking.room?.category || "",
    booking_status: booking.status,
    payment_status: booking.payment_status,
    total_amount: Number(booking.total_amount || 0).toFixed(2),
    paid_amount: Number(booking.amount_paid || booking.advance_paid || 0).toFixed(2),
    remaining_amount: Number(booking.remaining_amount || 0).toFixed(2),
    check_in_date: booking.check_in,
    actual_check_in_ist: booking.actual_checkin_time
      ? formatISTDateTimeForReport(booking.actual_checkin_time)
      : "",
    original_checkout_date: booking.original_checkout_date
      || extensions[0]?.original_checkout_date
      || booking.check_out,
    actual_checkout_ist: booking.actual_checkout_time
      ? formatISTDateTimeForReport(booking.actual_checkout_time)
      : "",
    early_checkout: isEarlyCheckout ? "Yes" : "No",
    early_checkout_reason: booking.early_checkout_reason || "",
    checked_out_by: booking.checked_out_by_staff_id
      ? `${booking.checked_out_by_role || "receptionist"} #${booking.checked_out_by_staff_id}`
      : "",
    room_status_after_checkout: booking.room_status_after_checkout
      || (booking.status === "checked_out" ? booking.room?.status || "" : ""),
    refund_adjustment: Number(booking.early_checkout_refund_amount || 0).toFixed(2),
    adjustment_charge: Number(booking.early_checkout_adjustment_charge || 0).toFixed(2),
    policy_applied: booking.early_checkout_policy_applied || "",
    extension_amount: Number(extensionAmount).toFixed(2),
    extension_payment_status: latestExtension?.payment_status || "",
    extension_payment_mode: latestExtension?.payment_method || "",
    extension_payment_reference: latestExtension?.payment_reference || "",
    extension_confirmed_by: latestExtension?.payment_confirmed_by
      ? `${latestExtension.payment_confirmed_by_role || "receptionist"} #${latestExtension.payment_confirmed_by}`
      : "",
    extension_confirmed_at_ist: latestExtension?.payment_confirmed_at
      ? formatISTDateTimeForReport(latestExtension.payment_confirmed_at)
      : "",
    created_at_ist: formatISTDateTimeForReport(booking.created_at),
  };
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
      {
        association: "extensionRequests",
        required: false,
        separate: true,
        order: [["requested_at", "ASC"]],
      },
    ],
    order: [["created_at", "ASC"]],
  });
}

async function getExtensionPaymentRows(filters) {
  if (!PaymentTransaction?.findAll) return [];
  const payments = await PaymentTransaction.findAll({
    where: {
      payment_type: "extension_payment",
      status: "paid",
      paid_at: { [Op.between]: [filters.dateFrom, filters.dateTo] },
    },
    include: [
      {
        association: "booking",
        required: false,
        include: [
          { association: "customer", required: false },
          { association: "room", required: false },
        ],
      },
      { association: "extensionRequest", required: false },
    ],
    order: [["paid_at", "ASC"]],
  });

  return payments.map((record) => {
    const payment = typeof record.get === "function" ? record.get({ plain: true }) : record;
    const extension = payment.extensionRequest || {};
    return {
      payment_id: payment.id,
      booking_id: payment.booking_id,
      booking_ref: payment.booking?.booking_ref || "",
      customer_name: payment.booking?.customer?.full_name || "",
      room_number: payment.booking?.room?.room_number || "",
      category: payment.booking?.room?.category || "",
      extension_request_id: payment.extension_request_id,
      extension_amount: Number(payment.amount || 0).toFixed(2),
      extension_payment_status: payment.status,
      extension_payment_mode: payment.payment_method,
      extension_payment_reference: payment.payment_reference || "",
      extension_confirmed_by: payment.confirmed_by_user_id
        ? `${payment.confirmed_by_role || "receptionist"} #${payment.confirmed_by_user_id}`
        : "",
      extension_confirmed_at_ist: payment.paid_at
        ? formatISTDateTimeForReport(payment.paid_at)
        : "",
      paid_at: payment.paid_at || null,
      original_checkout_date: extension.original_checkout_date || extension.requested_from || "",
      extended_checkout_date: extension.extended_checkout_date || extension.requested_to || "",
      extension_nights: Number(extension.extension_nights || extension.nights || 0),
      note: payment.remarks || "",
    };
  });
}

async function getReport(filtersInput = {}) {
  const filters = normalizeFilters(filtersInput);
  const bookings = await getFilteredBookings(filters);
  const occupancy = await getOccupancySnapshot(filters);
  const extensionPayments = await getExtensionPaymentRows(filters);

  const revenueBookings = bookings.filter((booking) => booking.status !== "cancelled");
  const revenueBookingIds = new Set(revenueBookings.map((booking) => Number(booking.id)));
  const externalExtensionPayments = extensionPayments.filter(
    (payment) => !revenueBookingIds.has(Number(payment.booking_id))
  );
  const totalRooms = await Room.count({
    where: filters.category ? { category: filters.category, is_active: true } : { is_active: true },
  });
  const totalDays = Math.max(
    1,
    Math.round((filters.dateTo.getTime() - filters.dateFrom.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  const revenueSeriesMap = {};
  for (const booking of revenueBookings) {
    const key = getBusinessDate(new Date(booking.created_at), env.hotelTimeZone);
    if (!revenueSeriesMap[key]) {
      revenueSeriesMap[key] = { revenue: 0, bookings: 0 };
    }
    revenueSeriesMap[key].revenue += settledBookingRevenue(booking);
    revenueSeriesMap[key].bookings += 1;
  }
  for (const payment of externalExtensionPayments) {
    const key = payment.extension_confirmed_at_ist
      ? getBusinessDate(new Date(payment.paid_at), env.hotelTimeZone)
      : filters.dateFromLabel;
    if (!revenueSeriesMap[key]) revenueSeriesMap[key] = { revenue: 0, bookings: 0 };
    revenueSeriesMap[key].revenue += Number(payment.extension_amount || 0);
  }

  const categoryRevenueMap = {};
  for (const booking of revenueBookings) {
    const category = booking.room?.category || "Unknown";
    if (!categoryRevenueMap[category]) {
      categoryRevenueMap[category] = { category, revenue: 0, bookings: 0 };
    }
    categoryRevenueMap[category].revenue += settledBookingRevenue(booking);
    categoryRevenueMap[category].bookings += 1;
  }
  for (const payment of externalExtensionPayments) {
    const category = payment.category || "Unknown";
    if (!categoryRevenueMap[category]) {
      categoryRevenueMap[category] = { category, revenue: 0, bookings: 0 };
    }
    categoryRevenueMap[category].revenue += Number(payment.extension_amount || 0);
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
      total_revenue: Number((
        sumBy(revenueBookings, settledBookingRevenue)
        + sumBy(externalExtensionPayments, (payment) => payment.extension_amount)
      ).toFixed(2)),
      extension_revenue: Number(sumBy(extensionPayments, (payment) => payment.extension_amount).toFixed(2)),
      extension_payment_count: extensionPayments.length,
      gst_collected: Number(sumBy(revenueBookings, (booking) => booking.gst_amount).toFixed(2)),
      total_customers: distinctCustomers,
      checked_out: bookings.filter((booking) => booking.status === "checked_out").length,
      early_checked_out: bookings.filter((booking) => booking.is_early_checkout).length,
      cancelled: bookings.filter((booking) => booking.status === "cancelled").length,
      avg_stay_nights: Number(avgStayNights.toFixed(2)),
      occupancy_rate: Number(occupancyRate.toFixed(2)),
      date_from: filters.dateFromLabel,
      date_to: filters.dateToLabel,
    },
    revenueSeries: mapToSortedSeries(revenueSeriesMap).map((entry) => ({
      ...entry,
      revenue: Number(entry.revenue.toFixed(2)),
    })),
    revenueByCategory,
    bookingsByStatus: buildStatusSummary(bookings),
    occupancy,
    bookings: bookings.map(buildBookingReportRow),
    extensionPayments,
    filters: {
      year: filters.year,
      month: filters.month,
      dateFrom: filters.dateFromLabel,
      dateTo: filters.dateToLabel,
      category: filters.category || null,
      status: filters.status || null,
    },
  };
}

async function getReportCsvRows(filtersInput = {}) {
  const filters = normalizeFilters(filtersInput);
  const bookings = await getFilteredBookings(filters);

  return bookings.map(buildBookingReportRow);
}

module.exports = {
  getReport,
  getReportCsvRows,
  buildBookingReportRow,
  normalizeFilters,
};
