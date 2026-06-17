const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const env = require("../../config/env");
const { Admin, Customer, Staff } = require("../../../models");
const { sendEmail, hasUsableSmtpConfig } = require("../../services/emailService");

const RESET_WINDOW_MINUTES = 15;
const FORGOT_SUCCESS_RESPONSE = "Password reset link sent to your email.";
const UNKNOWN_EMAIL_RESPONSE = "No account found with this email address.";
const RESETTABLE_MODELS = [
  { type: "admin", model: Admin, whereBase: {} },
  { type: "staff", model: Staff, whereBase: { is_active: true } },
  { type: "customer", model: Customer, whereBase: { is_deleted: false } },
];

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

async function findAccountByEmail(email) {
  for (const candidate of RESETTABLE_MODELS) {
    const where = {
      ...candidate.whereBase,
      email,
    };

    const record = await candidate.model.findOne({ where });
    if (record) {
      return { record, type: candidate.type };
    }
  }

  return null;
}

function createResetToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + RESET_WINDOW_MINUTES * 60 * 1000);

  return { token, hashedToken, expiresAt };
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildResetUrl(token) {
  const baseUrl = env.clientUrl || "http://localhost:5173";
  return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

async function dispatchResetEmail(account, resetUrl) {
  const fullName = account.full_name || "Guest";
  const emailPayload = {
    to: account.email,
    subject: "Reset your Panchavati Grand password",
    html: `
      <p>Namaste ${fullName},</p>
      <p>We received a request to reset your password.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a></p>
      <p>This link expires in ${RESET_WINDOW_MINUTES} minutes.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
    text: [
      `Namaste ${fullName},`,
      "",
      "We received a request to reset your password.",
      `Reset link: ${resetUrl}`,
      `This link expires in ${RESET_WINDOW_MINUTES} minutes.`,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
  };

  if (!hasUsableSmtpConfig()) {
    if (env.nodeEnv !== "production") {
      console.log(`Password reset link for ${account.email}: ${resetUrl}`);
    }
    return;
  }

  const result = await sendEmail(emailPayload);
  if (!result?.success) {
    console.error(`Password reset email failed for ${account.email}: ${result?.error || "unknown error"}`);
  }
}

async function forgotPassword(req, res) {
  const email = normalizeEmail(req.body.email);

  if (!email) {
    return res.status(400).json({
      success: false,
      error: "Email address is required",
    });
  }

  const match = await findAccountByEmail(email);

  if (!match?.record?.email) {
    return res.status(404).json({
      success: false,
      error: UNKNOWN_EMAIL_RESPONSE,
    });
  }

  const { token, hashedToken, expiresAt } = createResetToken();
  await match.record.update({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: expiresAt,
  });
  await dispatchResetEmail(match.record, buildResetUrl(token));

  return res.status(200).json({
    success: true,
    message: FORGOT_SUCCESS_RESPONSE,
  });
}

async function findAccountByToken(hashedToken) {
  const now = new Date();
  const candidates = [
    { model: Admin, whereBase: {} },
    { model: Staff, whereBase: { is_active: true } },
    { model: Customer, whereBase: { is_deleted: false } },
  ];

  for (const candidate of candidates) {
    const record = await candidate.model.findOne({
      where: {
        ...candidate.whereBase,
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { [Op.gt]: now },
      },
    });

    if (record) {
      return record;
    }
  }

  return null;
}

async function resetPassword(req, res) {
  const token = String(req.body.token || "").trim();
  const newPassword = String(req.body.newPassword || "");
  const hashedToken = hashResetToken(token);

  const account = await findAccountByToken(hashedToken);
  if (!account) {
    return res.status(400).json({
      success: false,
      error: "Reset link is invalid or expired",
    });
  }

  const password_hash = await bcrypt.hash(newPassword, 12);
  await account.update({
    password_hash,
    resetPasswordToken: null,
    resetPasswordExpires: null,
  });

  return res.json({
    success: true,
    message: "Password reset successful",
  });
}

module.exports = {
  forgotPassword,
  resetPassword,
};
