const express = require("express");
const passport = require("../../config/passport");
const { signToken } = require("../../utils/token");
const { sanitizeUser } = require("../../utils/serializers");

const router = express.Router();

// Google OAuth routes
router.get("/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get("/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Generate JWT token for the authenticated user
    const token = signToken({
      id: req.user.id,
      role: "customer",
      phone: req.user.phone,
      name: req.user.full_name,
    });

    // Redirect to frontend with token
    const redirectUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/auth/callback?token=${token}&provider=google`;
    res.redirect(redirectUrl);
  }
);

module.exports = router;