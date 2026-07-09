const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const { Staff } = require("../../../models");
const { sanitizeUser } = require("../../utils/serializers");
const { sendEmail } = require("../../services/emailService");
const { generateStaffPassword, validatePassword } = require("../../utils/passwordGenerator");
const { getPagination } = require("../../utils/pagination");

function normalizeStaffRole(value) {
  const role = String(value || "").trim().toLowerCase();
  if (!role) {
    return undefined;
  }

  if (role === "reception" || role === "receptionist") {
    return "receptionist";
  }

  if (role === "waiter" || role === "server") {
    return role;
  }

  return role;
}

function normalizeStaffPayload(payload = {}) {
  const normalized = {
    ...payload,
  };

  if (typeof normalized.full_name === "string") {
    normalized.full_name = normalized.full_name.trim();
  }

  if (typeof normalized.email === "string") {
    normalized.email = normalized.email.trim().toLowerCase();
  }

  if (typeof normalized.phone === "string") {
    normalized.phone = normalized.phone.trim();
  }

  if (normalized.role !== undefined) {
    normalized.role = normalizeStaffRole(normalized.role);
  }

  if (normalized.schedule && normalized.schedule_json === undefined) {
    normalized.schedule_json = normalized.schedule;
  }

  return Object.fromEntries(
    Object.entries(normalized).filter(([, value]) => value !== undefined)
  );
}

async function listStaff(req, res) {
  const queryRole = normalizeStaffRole(req.query.role);
  const { page, limit, offset } = getPagination(req.query);
  const where = queryRole ? { role: queryRole } : {};
  if (req.query.q) {
    const query = `%${req.query.q}%`;
    where[Op.or] = [
      { full_name: { [Op.like]: query } },
      { phone: { [Op.like]: query } },
      { email: { [Op.like]: query } },
      { role: { [Op.like]: query } },
    ];
  }
  const { count, rows } = await Staff.findAndCountAll({
    where,
    order: [["created_at", "DESC"]],
    attributes: { exclude: ["password_hash"] },
    offset,
    limit,
  });

  return res.json({
    success: true,
    data: rows,
    total: count,
    page,
    limit,
    totalRecords: count,
    totalPages: Math.max(Math.ceil(count / limit), 1),
    currentPage: page,
    pageSize: limit,
  });
}

async function createStaff(req, res) {
  const payload = normalizeStaffPayload(req.body);
  if (payload.role !== "receptionist") {
    return res.status(400).json({
      success: false,
      error: "Only reception staff can be created from this form",
    });
  }

  const existing = await Staff.findOne({
    where: {
      [Op.or]: [
        { email: payload.email },
        { phone: payload.phone },
      ],
    },
  });

  if (existing) {
    return res.status(409).json({
      success: false,
      error: "A staff member already exists with this email or phone",
    });
  }

  // Admin can provide a password, or we generate one
  let password = payload.password;
  
  if (!password) {
    password = generateStaffPassword();
  } else {
    // Validate provided password
    const validation = validatePassword(password);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: "Invalid password",
        details: validation.errors
      });
    }
  }

  const staff = await Staff.create({
    ...payload,
    password_hash: await bcrypt.hash(password, 12),
  });

  // Send welcome email with password
  const emailResult = await sendEmail({
    to: staff.email,
    subject: "Your Panchavati Grand Staff Account",
    html: `
      <h2>Welcome to Panchavati Grand</h2>
      <p>Hello ${staff.full_name},</p>
      <p>Your staff account has been created.</p>
      <p><strong>Temporary Password:</strong> ${password}</p>
      <p>Please change this password after your first login.</p>
    `,
    text: `Welcome to Panchavati Grand. Your temporary password is: ${password}`,
  });

  return res.status(201).json({
    success: true,
    data: sanitizeUser(staff),
    password: password, // Return password to admin so they can share it securely
    email_delivery: emailResult,
    message: "Staff member created successfully. Share the password with them securely.",
  });
}

async function listReceptionistStaff(req, res) {
  const { page, limit, offset } = getPagination(req.query);
  const { count, rows } = await Staff.findAndCountAll({
    where: { created_by_staff_id: req.user.id },
    order: [["created_at", "DESC"]],
    attributes: { exclude: ["password_hash"] },
    offset,
    limit,
  });

  return res.json({
    success: true,
    data: rows,
    total: count,
    page,
    limit,
    totalRecords: count,
    totalPages: Math.max(Math.ceil(count / limit), 1),
    currentPage: page,
    pageSize: limit,
  });
}

async function createReceptionistStaff(req, res) {
  const payload = normalizeStaffPayload(req.body);
  const allowedRoles = new Set(["housekeeping", "waiter", "admin_staff"]);
  if (!allowedRoles.has(payload.role)) {
    return res.status(400).json({
      success: false,
      error: "Receptionist can add housekeeping, waiter, or admin staff only",
    });
  }

  if (!payload.id_proof_url || !payload.id_proof_public_id) {
    return res.status(400).json({ success: false, error: "ID proof upload is required" });
  }

  if (payload.role === "admin_staff" && (!payload.specific_role || !payload.email)) {
    return res.status(400).json({
      success: false,
      error: "Specific role and email are required for admin staff",
    });
  }

  const conflictWhere = [{ phone: payload.phone }];
  if (payload.email) {
    conflictWhere.push({ email: payload.email });
  }

  const existing = await Staff.findOne({ where: { [Op.or]: conflictWhere } });
  if (existing) {
    return res.status(409).json({
      success: false,
      error: "A staff member already exists with this email or phone",
    });
  }

  const password = generateStaffPassword();
  const staff = await Staff.create({
    ...payload,
    password_hash: await bcrypt.hash(password, 12),
    created_by_staff_id: req.user.id,
    is_active: payload.is_active ?? true,
  });

  return res.status(201).json({
    success: true,
    data: sanitizeUser(staff),
    message: "Staff member added successfully",
  });
}

async function updateStaff(req, res) {
  const staff = await Staff.findByPk(req.params.id);
  if (!staff) {
    return res.status(404).json({ success: false, error: "Staff member not found" });
  }

  const updates = normalizeStaffPayload(req.body);
  if (updates.role !== undefined) {
    delete updates.role;
  }

  if (updates.email || updates.phone) {
    const conflict = await Staff.findOne({
      where: {
        id: { [Op.ne]: staff.id },
        [Op.or]: [
          updates.email ? { email: updates.email } : null,
          updates.phone ? { phone: updates.phone } : null,
        ].filter(Boolean),
      },
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        error: "Another staff member already uses this email or phone",
      });
    }
  }

  if (updates.password) {
    const validation = validatePassword(updates.password);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: "Invalid password",
        details: validation.errors,
      });
    }
    updates.password_hash = await bcrypt.hash(updates.password, 12);
    delete updates.password;
  }

  await staff.update(updates);

  return res.json({
    success: true,
    data: sanitizeUser(staff),
    message: "Staff updated successfully",
  });
}

async function deleteStaff(req, res) {
  const staff = await Staff.findByPk(req.params.id);
  if (!staff) {
    return res.status(404).json({ success: false, error: "Staff member not found" });
  }

  await staff.destroy();
  return res.json({
    success: true,
    message: "Staff deleted successfully",
  });
}

async function toggleStaffActive(req, res) {
  const staff = await Staff.findByPk(req.params.id);
  if (!staff) {
    return res.status(404).json({ success: false, error: "Staff member not found" });
  }

  await staff.update({ is_active: !staff.is_active });

  return res.json({
    success: true,
    data: sanitizeUser(staff),
    message: staff.is_active ? "Staff activated" : "Staff deactivated",
  });
}

async function resetStaffPassword(req, res) {
  const staff = await Staff.findByPk(req.params.id);
  if (!staff) {
    return res.status(404).json({ success: false, error: "Staff member not found" });
  }

  if (staff.role !== "receptionist") {
    return res.status(403).json({
      success: false,
      error: "Passwords can only be reset for reception profiles",
    });
  }

  const tempPassword = generateStaffPassword();
  await staff.update({
    password_hash: await bcrypt.hash(tempPassword, 12),
  });

  const emailResult = await sendEmail({
    to: staff.email,
    subject: "Panchavati Grand - Password Reset",
    html: `
      <h2>Password Reset</h2>
      <p>Your password has been reset by admin.</p>
      <p><strong>New Temporary Password:</strong> ${tempPassword}</p>
      <p>Please change this password after your next login.</p>
    `,
    text: `Your password has been reset. New temporary password is: ${tempPassword}`,
  });

  return res.json({
    success: true,
    data: { id: staff.id, tempPassword, email_delivery: emailResult },
    message: "Staff password reset successfully. Share the new password with them.",
  });
}

module.exports = {
  listStaff,
  listReceptionistStaff,
  createStaff,
  createReceptionistStaff,
  updateStaff,
  deleteStaff,
  toggleStaffActive,
  resetStaffPassword,
};
