const bcrypt = require("bcryptjs");
const { Admin, Customer, Staff } = require("../../../models");
const { sanitizeUser } = require("../../utils/serializers");
const { signToken } = require("../../utils/token");

const portalStaffRoles = new Set(["receptionist", "manager"]);

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function buildAuthResponse(record, role, expiry = "8h") {
  const token = signToken({
    id: record.id,
    role,
    phone: record.phone || undefined,
    name: record.full_name,
  }, expiry);

  return {
    token,
    user: { ...sanitizeUser(record), role },
  };
}

async function login(req, res) {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");

  const admin = await Admin.findOne({ where: { email } });
  if (admin && await bcrypt.compare(password, admin.password_hash)) {
    return res.json({
      success: true,
      data: buildAuthResponse(admin, "admin"),
    });
  }

  const staff = await Staff.findOne({ where: { email, is_active: true } });
  if (staff && await bcrypt.compare(password, staff.password_hash)) {
    if (!portalStaffRoles.has(staff.role)) {
      return res.status(403).json({
        success: false,
        error: "This staff role does not have a separate login portal. Cleaning and support work is managed from the receptionist desk.",
      });
    }

    return res.json({
      success: true,
      data: buildAuthResponse(staff, staff.role),
    });
  }

  const customer = await Customer.findOne({
    where: {
      email,
      is_deleted: false,
    },
  });

  if (customer?.password_hash && await bcrypt.compare(password, customer.password_hash)) {
    return res.json({
      success: true,
      data: buildAuthResponse(customer, "customer"),
    });
  }

  return res.status(401).json({
    success: false,
    error: "Invalid email or password",
  });
}

module.exports = { login };
