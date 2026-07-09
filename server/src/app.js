require("express-async-errors");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const session = require("express-session");
const passport = require("./config/passport");
const cron = require("node-cron");
const env = require("./config/env");
const { uploadsDir } = require("./bootstrap/database");
const publicRoutes = require("./routes/public");
const customerRoutes = require("./routes/customer");
const receptionistRoutes = require("./routes/receptionist");
const adminRoutes = require("./routes/admin");
const workerRoutes = require("./routes/worker");
const uploadRoutes = require("./routes/upload");
const socialAuthRoutes = require("./routes/auth/socialAuth");
const authMiddleware = require("./middleware/authMiddleware");
const roleGuard = require("./middleware/roleGuard");
const errorHandler = require("./middleware/errorHandler");
const { autoCancelOverdueBookings } = require("./services/reservationService");
const { isLogSavingEnabled } = require("./services/auditService");
const { expireOffers } = require("./controllers/room/offerController");
const { expireCoupons } = require("./services/couponService");

const app = express();
const allowedOrigins = new Set((env.corsOrigins || []).map((origin) => String(origin).trim()).filter(Boolean));

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  return allowedOrigins.has(origin);
}

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Session middleware for OAuth
app.use(session({
  secret: env.jwtSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: env.nodeEnv === "production",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Serve uploaded files with CORS headers
app.use("/uploads", (req, res, next) => {
  const requestOrigin = req.headers.origin;
  if (requestOrigin && isAllowedOrigin(requestOrigin)) {
    res.header("Access-Control-Allow-Origin", requestOrigin);
  } else if (env.clientUrl) {
    res.header("Access-Control-Allow-Origin", env.clientUrl);
  }
  res.header("Vary", "Origin");
  res.header("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
  next();
}, express.static(uploadsDir));

app.use("/api", publicRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/auth", socialAuthRoutes);
app.use("/api/customer", authMiddleware, roleGuard(["customer"]), customerRoutes);
app.use("/api/receptionist", authMiddleware, roleGuard(["receptionist", "manager"]), receptionistRoutes);
app.use("/api/admin", authMiddleware, roleGuard(["admin"]), adminRoutes);
app.use("/api/worker", authMiddleware, roleGuard(["housekeeping", "kitchen", "server", "waiter"]), workerRoutes);

cron.schedule("0 2 1 * *", () => {
  console.log("Monthly report automation placeholder triggered");
});

cron.schedule("*/5 * * * *", async () => {
  try {
    const results = await autoCancelOverdueBookings();
    const cancelledCount = results.filter((item) => item.cancelled).length;
    const failureCount = results.filter((item) => item.reason === "processing_error").length;
    if ((cancelledCount > 0 || failureCount > 0) && await isLogSavingEnabled()) {
      console.log("No-show auto-cancel job completed", {
        candidates: results.length,
        cancelled: cancelledCount,
        failed: failureCount,
      });
    }
  } catch (error) {
    console.error("No-show auto-cancel job failed", error);
  }
}, {
  timezone: env.hotelTimeZone,
  noOverlap: true,
});

cron.schedule("15 0 * * *", async () => {
  try {
    await Promise.all([expireOffers(), expireCoupons()]);
  } catch (error) {
    console.error("Promotion expiry cleanup job failed", error);
  }
});

app.use(errorHandler);

module.exports = app;
