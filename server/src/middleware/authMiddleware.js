const jwt = require("jsonwebtoken");
const env = require("../config/env");

function authMiddleware(req, res, next) {
  console.log("Authorization Header:", req.headers.authorization);

  const authHeader = typeof req.headers.authorization === "string"
    ? req.headers.authorization.trim()
    : "";

  if (!authHeader) {
    console.warn(`[AUTH] Missing Authorization header for ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ success: false, error: "Authentication required" });
  }

  const [scheme, ...tokenParts] = authHeader.split(/\s+/);
  const token = tokenParts.join(" ").trim();

  if (!/^Bearer$/i.test(scheme) || !token) {
    console.warn(`[AUTH] Malformed Authorization header for ${req.method} ${req.originalUrl}`);
    return res.status(401).json({
      success: false,
      error: "Malformed Authorization header. Expected: Bearer <token>",
    });
  }

  if (!env.jwtSecret || !String(env.jwtSecret).trim()) {
    console.error("[AUTH] JWT_SECRET is not configured");
    return res.status(500).json({ success: false, error: "Server auth configuration error" });
  }

  try {
    req.user = jwt.verify(token, env.jwtSecret);
    return next();
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      console.warn(`[AUTH] Expired token for ${req.method} ${req.originalUrl}`);
      return res.status(401).json({ success: false, error: "Token expired" });
    }

    if (error?.name === "JsonWebTokenError") {
      console.warn(`[AUTH] Invalid token for ${req.method} ${req.originalUrl}: ${error.message}`);
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    console.error(`[AUTH] Token verification failed for ${req.method} ${req.originalUrl}: ${error.message}`);
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}

module.exports = authMiddleware;

