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

const app = express();

app.use(helmet());
app.use(cors({
  origin: env.clientUrl,
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
  res.header("Access-Control-Allow-Origin", env.clientUrl);
  res.header("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
  next();
}, express.static(uploadsDir));

app.use("/api", publicRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/auth", socialAuthRoutes);
app.use("/api/customer", authMiddleware, roleGuard(["customer"]), customerRoutes);
app.use("/api/receptionist", authMiddleware, roleGuard(["receptionist", "manager"]), receptionistRoutes);
app.use("/api/admin", authMiddleware, roleGuard(["admin"]), adminRoutes);
app.use("/api/worker", authMiddleware, roleGuard(["housekeeping", "kitchen", "server"]), workerRoutes);

cron.schedule("0 2 1 * *", () => {
  console.log("Monthly report automation placeholder triggered");
});

app.use(errorHandler);

module.exports = app;
