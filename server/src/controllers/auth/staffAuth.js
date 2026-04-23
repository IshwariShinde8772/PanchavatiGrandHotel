const bcrypt = require("bcryptjs");
const { Staff } = require("../../../models");
const { sanitizeUser } = require("../../utils/serializers");
const { signToken } = require("../../utils/token");

const portalStaffRoles = new Set(["receptionist", "manager", "housekeeping", "kitchen", "server"]);

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

async function loginStaff(req, res) {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  const staff = await Staff.findOne({ where: { email, is_active: true } });

  if (!staff) {
    return res.status(401).json({ success: false, error: "Invalid email or password" });
  }

  const matches = await bcrypt.compare(password, staff.password_hash);
  if (!matches) {
    return res.status(401).json({ success: false, error: "Invalid email or password" });
  }

  if (!portalStaffRoles.has(staff.role)) {
    return res.status(403).json({
      success: false,
      error: "This staff role is not allowed to access the portal",
    });
  }

  const token = signToken({
    id: staff.id,
    role: staff.role,
    name: staff.full_name,
  }, "8h");

  return res.json({
    success: true,
    data: {
      token,
      user: sanitizeUser(staff),
    },
  });
}

module.exports = { loginStaff };
