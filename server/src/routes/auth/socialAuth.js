const express = require("express");
const jwt = require("jsonwebtoken");
const passport = require("../../config/passport");
const env = require("../../config/env");
const { signToken } = require("../../utils/token");
const { sanitizeUser } = require("../../utils/serializers");
const { Customer } = require("../../../models");

const router = express.Router();
const OAUTH_EXCHANGE_COOKIE = "oauth_exchange_token";
const OAUTH_EXCHANGE_MAX_AGE_MS = 5 * 60 * 1000;
const isGoogleConfigured = Boolean(env.google.clientId && env.google.clientSecret);

function parseCookies(header = "") {
  return header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) {
        return acc;
      }

      const key = decodeURIComponent(part.slice(0, separatorIndex).trim());
      const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());
      acc[key] = value;
      return acc;
    }, {});
}

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    maxAge: OAUTH_EXCHANGE_MAX_AGE_MS,
    path: "/api/auth/oauth/exchange",
  };
}

function clearOauthCookie(res) {
  res.clearCookie(OAUTH_EXCHANGE_COOKIE, {
    ...getCookieOptions(),
    maxAge: 0,
  });
}

function redirectGoogleNotConfigured(res) {
  if (env.clientUrl) {
    return res.redirect(`${env.clientUrl}/login?error=google_not_configured`);
  }

  return res.status(503).json({
    success: false,
    error: "Google login is not configured on the server",
  });
}

// Google OAuth routes
if (isGoogleConfigured) {
  router.get("/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  router.get("/google/callback",
    passport.authenticate("google", { failureRedirect: `${env.clientUrl}/login?error=oauth_failed` }),
    (req, res) => {
      const token = signToken({
        id: req.user.id,
        role: "customer",
        phone: req.user.phone,
        name: req.user.full_name,
      }, "5m");

      res.cookie(OAUTH_EXCHANGE_COOKIE, token, getCookieOptions());
      res.redirect(`${env.clientUrl}/auth/callback?provider=google`);
    }
  );
} else {
  router.get("/google", (req, res) => redirectGoogleNotConfigured(res));
  router.get("/google/callback", (req, res) => redirectGoogleNotConfigured(res));
}

router.get("/oauth/exchange", async (req, res) => {
  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies[OAUTH_EXCHANGE_COOKIE];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "OAuth exchange token not found or expired",
    });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const customer = await Customer.findByPk(payload.id);

    if (!customer) {
      clearOauthCookie(res);
      return res.status(401).json({
        success: false,
        error: "Customer account not found",
      });
    }

    clearOauthCookie(res);
    return res.json({
      success: true,
      data: {
        token,
        user: { ...sanitizeUser(customer), role: "customer" },
      },
      message: "OAuth exchange completed successfully",
    });
  } catch (error) {
    clearOauthCookie(res);
    return res.status(401).json({
      success: false,
      error: "OAuth exchange token is invalid or expired",
    });
  }
});

module.exports = router;
