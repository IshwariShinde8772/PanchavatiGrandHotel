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

module.exports = {
  startOfTodayUTC,
  parseDateInput,
  diffNights,
  isDateInRange,
};

