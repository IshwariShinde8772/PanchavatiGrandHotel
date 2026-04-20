const rateLimit = require("express-rate-limit");

const customerLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many customer login attempts. Try again later." },
  keyGenerator: (req) => `customer_${req.body.email || req.body.phone || req.ip}`,
});

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many admin login attempts. Try again later." },
  keyGenerator: (req) => `admin_${req.body.email || req.ip}`,
});

const staffLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many staff login attempts. Try again later." },
  keyGenerator: (req) => `staff_${req.body.email || req.ip}`,
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body.phone || req.ip,
  message: { success: false, error: "Too many OTP requests. Try again in 15 minutes." },
});

module.exports = {
  customerLoginLimiter,
  adminLoginLimiter,
  staffLoginLimiter,
  otpLimiter,
};
