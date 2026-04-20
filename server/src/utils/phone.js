const PHONE_E164_REGEX = /^\+\d{10,15}$/;

function normalizePhoneNumber(value, defaultCountryCode = "+91") {
  if (value === undefined || value === null) {
    return undefined;
  }

  const raw = String(value).trim();
  if (!raw) {
    return undefined;
  }

  const digits = raw.replace(/\D/g, "");
  if (!digits) {
    return undefined;
  }

  if (raw.startsWith("+")) {
    return `+${digits}`;
  }

  if (digits.length === 10 && defaultCountryCode) {
    return `${defaultCountryCode}${digits}`;
  }

  if (digits.length >= 11 && digits.length <= 15) {
    return `+${digits}`;
  }

  return raw;
}

function isValidPhoneNumber(value) {
  return PHONE_E164_REGEX.test(normalizePhoneNumber(value) || "");
}

module.exports = {
  PHONE_E164_REGEX,
  normalizePhoneNumber,
  isValidPhoneNumber,
};
