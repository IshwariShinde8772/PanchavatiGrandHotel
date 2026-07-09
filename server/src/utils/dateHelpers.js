function startOfTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function parseDateInput(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function diffNights(checkIn, checkOut) {
  const ms = parseDateInput(checkOut) - parseDateInput(checkIn);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function isDateInRange(target, start, end) {
  const targetDate = parseDateInput(target);
  const startDate = parseDateInput(start);
  const endDate = parseDateInput(end);

  if (!targetDate || !startDate || !endDate) {
    return false;
  }

  return targetDate >= startDate && targetDate <= endDate;
}

const DEFAULT_BUSINESS_TIME_ZONE = "Asia/Kolkata";
const DATE_FILTERS = new Set(["today", "tomorrow", "this_week", "next_week", "this_month"]);
const TIME_INPUT_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

function normalizeTimeInput(value) {
  const match = TIME_INPUT_PATTERN.exec(String(value || "").trim());
  if (!match) {
    return null;
  }

  return `${match[1]}:${match[2]}`;
}

function parseDateOnlyParts(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
  if (!match) {
    return null;
  }

  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  const testDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (
    testDate.getUTCFullYear() !== parts.year
    || testDate.getUTCMonth() !== parts.month - 1
    || testDate.getUTCDate() !== parts.day
  ) {
    return null;
  }

  return parts;
}

function dateTimePartsInTimeZone(value = new Date(), timeZone = DEFAULT_BUSINESS_TIME_ZONE) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function timeZoneOffsetMs(value, timeZone = DEFAULT_BUSINESS_TIME_ZONE) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = dateTimePartsInTimeZone(date, timeZone);
  if (!parts) return null;

  const zonedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return zonedAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function buildHotelDateTime(dateOnly, timeInput, timeZone = DEFAULT_BUSINESS_TIME_ZONE) {
  const dateParts = parseDateOnlyParts(dateOnly);
  const normalizedTime = normalizeTimeInput(timeInput);
  if (!dateParts || !normalizedTime) {
    return null;
  }

  const [hour, minute] = normalizedTime.split(":").map(Number);
  const localAsUtc = Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    hour,
    minute,
    0
  );
  let candidate = new Date(localAsUtc);

  // Resolve the zone offset twice so this also behaves correctly in zones with DST.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const offset = timeZoneOffsetMs(candidate, timeZone);
    if (offset === null) return null;
    candidate = new Date(localAsUtc - offset);
  }

  const resolved = dateTimePartsInTimeZone(candidate, timeZone);
  if (
    !resolved
    || resolved.year !== dateParts.year
    || resolved.month !== dateParts.month
    || resolved.day !== dateParts.day
    || resolved.hour !== hour
    || resolved.minute !== minute
  ) {
    return null;
  }

  return candidate;
}

function calculateAutoCancelAt(
  dateOnly,
  timeInput,
  graceMinutes = 60,
  timeZone = DEFAULT_BUSINESS_TIME_ZONE
) {
  const checkInDateTime = buildHotelDateTime(dateOnly, timeInput, timeZone);
  const minutes = Number(graceMinutes);
  if (!checkInDateTime || !Number.isInteger(minutes) || minutes < 1) {
    return null;
  }

  return new Date(checkInDateTime.getTime() + minutes * 60 * 1000);
}

function datePartsInTimeZone(value = new Date(), timeZone = DEFAULT_BUSINESS_TIME_ZONE) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function dateOnlyFromParts({ year, month, day }) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDateOnlyDays(value, days) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) {
    return null;
  }

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getBusinessDate(value = new Date(), timeZone = DEFAULT_BUSINESS_TIME_ZONE) {
  const parts = datePartsInTimeZone(value, timeZone);
  return parts ? dateOnlyFromParts(parts) : null;
}

function formatToIST(value, {
  includeSeconds = false,
  timeZone = DEFAULT_BUSINESS_TIME_ZONE,
} = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(includeSeconds ? { second: "2-digit" } : {}),
    hour12: true,
  }).format(date);

  return `${formatted.replace(/\b(am|pm)\b/i, (period) => period.toUpperCase())} IST`;
}

function getCurrentISTDateTime(value = new Date()) {
  return formatToIST(value);
}

function formatISTDateTimeForReport(value) {
  return formatToIST(value);
}

function formatISTDateForUI(value) {
  const parts = parseDateOnlyParts(String(value || "").slice(0, 10));
  if (!parts) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
}

function getTimeZoneDateRange(dateOnly, timeZone = DEFAULT_BUSINESS_TIME_ZONE) {
  const start = buildHotelDateTime(dateOnly, "00:00", timeZone);
  const nextDate = addDateOnlyDays(dateOnly, 1);
  const end = nextDate ? buildHotelDateTime(nextDate, "00:00", timeZone) : null;
  return start && end ? { start, end } : null;
}

function getDateFilterRange(filter, value = new Date(), timeZone = DEFAULT_BUSINESS_TIME_ZONE) {
  const normalizedFilter = String(filter || "").toLowerCase();
  if (!DATE_FILTERS.has(normalizedFilter)) {
    return null;
  }

  const today = getBusinessDate(value, timeZone);
  const todayDate = new Date(`${today}T00:00:00.000Z`);

  if (normalizedFilter === "today") {
    return { start: today, end: today };
  }

  if (normalizedFilter === "tomorrow") {
    const tomorrow = addDateOnlyDays(today, 1);
    return { start: tomorrow, end: tomorrow };
  }

  if (normalizedFilter === "this_month") {
    const year = todayDate.getUTCFullYear();
    const month = todayDate.getUTCMonth();
    const start = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
    const end = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
    return { start, end };
  }

  const dayOfWeek = todayDate.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const thisMonday = addDateOnlyDays(today, -daysSinceMonday);

  if (normalizedFilter === "this_week") {
    return { start: thisMonday, end: addDateOnlyDays(thisMonday, 6) };
  }

  const nextMonday = addDateOnlyDays(thisMonday, 7);
  return { start: nextMonday, end: addDateOnlyDays(nextMonday, 6) };
}

module.exports = {
  DEFAULT_BUSINESS_TIME_ZONE,
  TIME_INPUT_PATTERN,
  startOfTodayUTC,
  parseDateInput,
  diffNights,
  isDateInRange,
  buildHotelDateTime,
  calculateAutoCancelAt,
  formatISTDateForUI,
  formatISTDateTimeForReport,
  formatToIST,
  getBusinessDate,
  getCurrentISTDateTime,
  getDateFilterRange,
  getTimeZoneDateRange,
  normalizeTimeInput,
  addDateOnlyDays,
};

