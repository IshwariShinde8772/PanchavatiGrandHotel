const bcrypt = require("bcryptjs");
const { Admin } = require("../../../models");
const { sanitizeUser } = require("../../utils/serializers");
const { signToken } = require("../../utils/token");

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

async function loginAdmin(req, res) {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  const admin = await Admin.findOne({ where: { email } });

  if (!admin) {
    return res.status(401).json({ success: false, error: "Invalid email or password" });
  }

  const matches = await bcrypt.compare(password, admin.password_hash);
  if (!matches) {
    return res.status(401).json({ success: false, error: "Invalid email or password" });
  }

  const token = signToken({
    id: admin.id,
    role: "admin",
    name: admin.full_name,
  }, "8h");

  return res.json({
    success: true,
    data: {
      token,
      user: { ...sanitizeUser(admin), role: "admin" },
    },
  });
}

module.exports = { loginAdmin };
