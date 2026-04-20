const bcrypt = require("bcryptjs");

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function hashOtp(otp) {
  return bcrypt.hash(otp, 10);
}

async function verifyOtp(otp, hashedOtp) {
  if (!hashedOtp) {
    return false;
  }

  return bcrypt.compare(otp, hashedOtp);
}

module.exports = {
  generateOtp,
  hashOtp,
  verifyOtp,
};

