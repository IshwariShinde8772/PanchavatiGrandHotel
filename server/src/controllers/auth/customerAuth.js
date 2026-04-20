const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const { Customer, Booking, SavedRoom, Room, Notification } = require("../../../models");
const { sendSms } = require("../../config/smsGateway");
const { generateOtp, hashOtp, verifyOtp } = require("../../services/otpService");
const { sendEmail } = require("../../services/emailService");
const { normalizePhoneNumber } = require("../../utils/phone");
const { sanitizeUser } = require("../../utils/serializers");
const { signToken } = require("../../utils/token");

function normalizeOptionalText(value, options = {}) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return undefined;
  }

  return options.lowercase ? normalized.toLowerCase() : normalized;
}

function normalizeCustomerPayload(payload = {}) {
  return {
    ...payload,
    full_name: normalizeOptionalText(payload.full_name),
    email: normalizeOptionalText(payload.email, { lowercase: true }),
    phone: normalizePhoneNumber(payload.phone),
  };
}

async function sendOtpCode(req, res) {
  const { phone, full_name } = normalizeCustomerPayload(req.body);
  
  if (!phone) {
    return res.status(400).json({ success: false, error: "Phone number is required" });
  }

  const otp = generateOtp();
  const hashedOtp = await hashOtp(otp);
  const expiry = new Date(Date.now() + 10 * 60 * 1000);

  const [customer] = await Customer.findOrCreate({
    where: { phone },
    defaults: {
      full_name: full_name || "Guest",
      phone,
    },
  });

  // If full_name provided and is not current value, update it (for signup flow)
  if (full_name && customer.full_name === "Guest") {
    await customer.update({ full_name });
  }

  await customer.update({
    otp_code: hashedOtp,
    otp_expires_at: expiry,
    otp_verified: false,
  });

  let smsResult;
  try {
    smsResult = await sendSms(phone, `Your Panchavati Grand OTP is ${otp}. It is valid for 10 minutes.`);
  } catch (error) {
    console.error(`Failed to send OTP SMS to ${phone}: ${error.message}`);
    return res.status(502).json({
      success: false,
      error: "Failed to send OTP. Please try again in a moment.",
    });
  }

  console.log(`📱 OTP sent to ${phone}. OTP: ${otp}`);

  return res.json({
    success: true,
    data: {
      phone,
      expires_at: expiry,
      provider: smsResult?.provider,
      otp: process.env.NODE_ENV === "production" ? undefined : otp,
    },
    message: "OTP sent successfully",
  });
}

async function verifyOtpCode(req, res) {
  const { phone } = normalizeCustomerPayload(req.body);
  const { otp } = req.body;
  const customer = await Customer.findOne({ where: { phone } });

  if (!customer || !customer.otp_code || !customer.otp_expires_at) {
    return res.status(400).json({ success: false, error: "OTP not found. Please request a new code." });
  }

  if (new Date(customer.otp_expires_at) < new Date()) {
    return res.status(400).json({ success: false, error: "OTP expired. Please request a new code." });
  }

  const matches = await verifyOtp(otp, customer.otp_code);
  if (!matches) {
    console.warn(`❌ Invalid OTP attempt for ${phone}`);
    return res.status(400).json({ success: false, error: "Invalid OTP" });
  }

  await customer.update({
    otp_verified: true,
    otp_code: null,
    otp_expires_at: null,
  });
  console.log(`✅ OTP verified for ${phone}. Account: ${customer.full_name} (ID: ${customer.id})`);

  const token = signToken({
    id: customer.id,
    role: "customer",
    phone: customer.phone,
    name: customer.full_name,
  });

  return res.json({
    success: true,
    data: {
      token,
      user: { ...sanitizeUser(customer), role: "customer" },
    },
    message: "OTP verified successfully. Account ready to use.",
  });
}

async function registerCustomer(req, res) {
  try {
    const { full_name, email, phone, password } = normalizeCustomerPayload(req.body);
    
    // Validate that at least one unique identifier exists
    if (!email && !phone) {
      return res.status(400).json({ success: false, error: "Email or phone is required" });
    }

    const existingMatches = await Customer.findAll({
      where: {
        [Op.or]: [
          email ? { email } : null,
          phone ? { phone } : null,
        ].filter(Boolean),
      },
    });

    const emailOwner = existingMatches.find((item) => email && item.email === email);
    const phoneOwner = existingMatches.find((item) => phone && item.phone === phone);

    if (emailOwner && phoneOwner && emailOwner.id !== phoneOwner.id) {
      return res.status(409).json({
        success: false,
        error: "Email and phone already belong to different customer accounts",
      });
    }

    const existing = emailOwner || phoneOwner || null;
    const password_hash = password ? await bcrypt.hash(password, 12) : existing?.password_hash || null;
    const otp_verified = password ? true : existing?.otp_verified || false;

    let customer;
    let message = "Account created successfully";

    if (existing) {
      if (existing.password_hash) {
        return res.status(409).json({
          success: false,
          error: "Customer already exists with this email or phone",
        });
      }

      customer = await existing.update({
        full_name: full_name || existing.full_name || "Guest",
        email: email || existing.email || null,
        phone: phone || existing.phone || null,
        password_hash,
        otp_verified,
        is_deleted: false,
      });
      message = "Account completed successfully";
      console.log(`✅ Customer profile completed: ${customer.full_name} (${customer.id})`);
    } else {
      customer = await Customer.create({
        full_name: full_name || "Guest",
        email: email || null,
        phone: phone || null,
        password_hash,
        otp_verified,
      });
      console.log(`✅ Customer created: ${customer.full_name} (${customer.id})`);
    }

    // Send welcome email if email provided (don't fail registration if email fails)
    if (email) {
      try {
        await sendEmail({
          to: email,
          subject: "Welcome to Panchavati Grand",
          html: `<p>Namaste ${full_name || "Guest"}, welcome to Panchavati Grand, Nashik.</p>`,
          text: `Welcome to Panchavati Grand, ${full_name || "Guest"}`,
        });
        console.log(`📧 Welcome email sent to ${email}`);
      } catch (emailError) {
        console.warn(`⚠️ Email failed but registration succeeded: ${emailError.message}`);
        // Don't fail the registration if email fails
      }
    }

    const token = signToken({
      id: customer.id,
      role: "customer",
      phone: customer.phone,
      name: customer.full_name,
    });

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: { ...sanitizeUser(customer), role: "customer" },
      },
      message,
    });
  } catch (error) {
    console.error("❌ Error in registerCustomer:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create account",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

async function loginCustomer(req, res) {
  const { email, password } = normalizeCustomerPayload(req.body);
  const customer = await Customer.findOne({
    where: {
      email,
      is_deleted: false,
    },
  });

  if (!customer || !customer.password_hash) {
    return res.status(401).json({ success: false, error: "Invalid email or password" });
  }

  const matches = await bcrypt.compare(password, customer.password_hash);
  if (!matches) {
    return res.status(401).json({ success: false, error: "Invalid email or password" });
  }

  const token = signToken({
    id: customer.id,
    role: "customer",
    phone: customer.phone,
    name: customer.full_name,
  });

  return res.json({
    success: true,
    data: {
      token,
      user: { ...sanitizeUser(customer), role: "customer" },
    },
  });
}

async function forgotPassword(req, res) {
  const { email } = normalizeCustomerPayload(req.body);
  const customer = await Customer.findOne({ where: { email, is_deleted: false } });

  if (!customer) {
    return res.status(404).json({ success: false, error: "Customer not found" });
  }

  const otp = generateOtp();
  await customer.update({
    otp_code: await hashOtp(otp),
    otp_expires_at: new Date(Date.now() + 10 * 60 * 1000),
  });

  await sendEmail({
    to: email,
    subject: "Password reset OTP",
    html: `<p>Your OTP for password reset is <strong>${otp}</strong>.</p>`,
    text: `OTP: ${otp}`,
  });

  return res.json({
    success: true,
    data: { otp: process.env.NODE_ENV === "production" ? undefined : otp },
    message: "Password reset OTP sent",
  });
}

async function resetPassword(req, res) {
  const { email, otp, password } = normalizeCustomerPayload(req.body);
  const customer = await Customer.findOne({ where: { email, is_deleted: false } });

  if (!customer || !customer.otp_code || !customer.otp_expires_at) {
    return res.status(400).json({ success: false, error: "Reset request not found" });
  }

  if (new Date(customer.otp_expires_at) < new Date()) {
    return res.status(400).json({ success: false, error: "Reset OTP expired" });
  }

  const matches = await verifyOtp(otp, customer.otp_code);
  if (!matches) {
    return res.status(400).json({ success: false, error: "Invalid OTP" });
  }

  await customer.update({
    password_hash: await bcrypt.hash(password, 12),
    otp_code: null,
    otp_expires_at: null,
  });

  return res.json({
    success: true,
    message: "Password reset successful",
  });
}

async function getProfile(req, res) {
  const customer = await Customer.findByPk(req.user.id, {
    attributes: { exclude: ["password_hash", "otp_code", "otp_expires_at"] },
  });

  const totalStays = await Booking.count({
    where: {
      customer_id: req.user.id,
      status: "checked_out",
    },
  });

  return res.json({
    success: true,
    data: {
      ...customer.get({ plain: true }),
      role: "customer",
      welcome_back_message: totalStays
        ? `Welcome back, ${customer.full_name}! You've stayed with us ${totalStays} times.`
        : null,
    },
  });
}

async function updateProfile(req, res) {
  const customer = await Customer.findByPk(req.user.id);
  await customer.update(normalizeCustomerPayload(req.body));

  return res.json({
    success: true,
    data: { ...sanitizeUser(customer), role: "customer" },
    message: "Profile updated successfully",
  });
}

async function getSavedRooms(req, res) {
  const items = await SavedRoom.findAll({
    where: { customer_id: req.user.id },
    include: [{ model: Room, as: "room" }],
    order: [["saved_at", "DESC"]],
  });

  return res.json({
    success: true,
    data: items.map((item) => item.get({ plain: true })),
    total: items.length,
    page: 1,
    limit: items.length || 10,
  });
}

async function saveRoom(req, res) {
  const { room_id } = req.body;
  const [savedRoom] = await SavedRoom.findOrCreate({
    where: { customer_id: req.user.id, room_id },
    defaults: { customer_id: req.user.id, room_id },
  });

  return res.status(201).json({
    success: true,
    data: savedRoom,
    message: "Room saved successfully",
  });
}

async function removeSavedRoom(req, res) {
  await SavedRoom.destroy({
    where: { customer_id: req.user.id, room_id: Number(req.params.roomId) },
  });

  return res.json({
    success: true,
    message: "Saved room removed",
  });
}

async function getNotifications(req, res) {
  const notifications = await Notification.findAll({
    where: {
      [Op.or]: [
        { target_role: "customer", target_id: req.user.id },
        { target_role: "all" },
      ],
    },
    order: [["created_at", "DESC"]],
  });

  return res.json({
    success: true,
    data: notifications,
    total: notifications.length,
    page: 1,
    limit: notifications.length || 10,
  });
}

async function markNotificationsRead(req, res) {
  await Notification.update(
    { is_read: true },
    {
      where: {
        [Op.or]: [
          { target_role: "customer", target_id: req.user.id },
          { target_role: "all" },
        ],
      },
    }
  );

  return res.json({
    success: true,
    message: "Notifications marked as read",
  });
}

async function deleteNotification(req, res) {
  const count = await Notification.destroy({
    where: {
      id: req.params.id,
      [Op.or]: [
        { target_role: "customer", target_id: req.user.id },
        { target_role: "all" },
      ],
    },
  });

  if (!count) {
    return res.status(404).json({ success: false, error: "Notification not found" });
  }

  return res.json({ success: true, message: "Notification deleted" });
}

async function clearNotifications(req, res) {
  await Notification.destroy({
    where: {
      [Op.or]: [
        { target_role: "customer", target_id: req.user.id },
        { target_role: "all" },
      ],
    },
  });

  return res.json({ success: true, message: "All notifications cleared" });
}

async function listCustomers(req, res) {
  const customers = await Customer.findAll({
    attributes: { exclude: ["password_hash", "otp_code", "otp_expires_at"] },
    order: [["created_at", "DESC"]],
  });

  const bookings = await Booking.findAll();
  const byCustomer = bookings.reduce((acc, booking) => {
    acc[booking.customer_id] = acc[booking.customer_id] || { count: 0, spent: 0 };
    acc[booking.customer_id].count += 1;
    if (booking.status !== "cancelled") {
      acc[booking.customer_id].spent += Number(booking.total_amount);
    }
    return acc;
  }, {});

  return res.json({
    success: true,
    data: customers.map((customer) => {
      const stats = byCustomer[customer.id] || { count: 0, spent: 0 };
      return {
        ...customer.get({ plain: true }),
        total_bookings: stats.count,
        total_spent: Number(stats.spent.toFixed(2)),
      };
    }),
    total: customers.length,
    page: 1,
    limit: customers.length || 10,
  });
}

async function getCustomerDetail(req, res) {
  const customer = await Customer.findByPk(req.params.id, {
    attributes: { exclude: ["password_hash", "otp_code", "otp_expires_at"] },
    include: [
      { model: Booking, as: "bookings", include: [{ model: Room, as: "room" }] },
      { association: "feedbacks", required: false },
    ],
  });

  if (!customer) {
    return res.status(404).json({ success: false, error: "Customer not found" });
  }

  return res.json({
    success: true,
    data: customer,
  });
}

async function toggleCustomerDeleted(req, res) {
  const customer = await Customer.findByPk(req.params.id);
  if (!customer) {
    return res.status(404).json({ success: false, error: "Customer not found" });
  }

  await customer.update({ is_deleted: !customer.is_deleted });

  return res.json({
    success: true,
    data: sanitizeUser(customer),
    message: customer.is_deleted ? "Customer soft-deleted" : "Customer restored",
  });
}

module.exports = {
  sendOtpCode,
  verifyOtpCode,
  registerCustomer,
  loginCustomer,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  getSavedRooms,
  saveRoom,
  removeSavedRoom,
  getNotifications,
  markNotificationsRead,
  deleteNotification,
  clearNotifications,
  listCustomers,
  getCustomerDetail,
  toggleCustomerDeleted,
};
