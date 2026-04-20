function sanitizeUser(record) {
  if (!record) {
    return null;
  }

  const plain = typeof record.get === "function" ? record.get({ plain: true }) : { ...record };
  delete plain.password_hash;
  delete plain.otp_code;
  delete plain.otp_expires_at;
  return plain;
}

module.exports = { sanitizeUser };

