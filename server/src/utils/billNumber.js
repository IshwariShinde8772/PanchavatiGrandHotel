function createPrefixedNumber(prefix, year, id) {
  return `${prefix}-${year}-${String(id).padStart(5, "0")}`;
}

function bookingRefFromId(id, date = new Date()) {
  return createPrefixedNumber("PG", date.getUTCFullYear(), id);
}

function billRefFromId(id, date = new Date()) {
  return createPrefixedNumber("PG-BILL", date.getUTCFullYear(), id);
}

module.exports = {
  bookingRefFromId,
  billRefFromId,
};

