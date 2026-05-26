const UPCOMING_ALLOWED_STATUSES = new Set(["pending", "confirmed"]);
const UPCOMING_BLOCKED_STATUSES = new Set(["cancelled", "rejected", "checked_out"]);

function parseDateOnlyUTC(value) {
  const input = String(value || "").trim();
  if (!input) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    return new Date(Date.UTC(year, month, day));
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(Date.UTC(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate()
  ));
}

function getTodayUTC(referenceDate = new Date()) {
  return new Date(Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate()
  ));
}

export function isUpcomingBooking(booking, referenceDate = new Date()) {
  if (!booking || typeof booking !== "object") {
    return false;
  }

  const status = String(booking.status || "").toLowerCase();
  if (UPCOMING_BLOCKED_STATUSES.has(status) || !UPCOMING_ALLOWED_STATUSES.has(status)) {
    return false;
  }

  const checkIn = parseDateOnlyUTC(booking.check_in);
  const checkOut = parseDateOnlyUTC(booking.check_out);
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    return false;
  }

  return checkIn >= getTodayUTC(referenceDate);
}
