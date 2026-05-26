const { z } = require("zod");
const { PHONE_E164_REGEX, normalizePhoneNumber } = require("../utils/phone");

const trimString = (value) => (typeof value === "string" ? value.trim() : value);
const optionalTrimmed = (schema) =>
  z.preprocess((value) => {
    const trimmed = trimString(value);
    return trimmed === "" ? undefined : trimmed;
  }, schema.optional());

const requiredTrimmed = (schema) =>
  z.preprocess((value) => trimString(value), schema);

const normalizePhoneInput = (value) => {
  const trimmed = trimString(value);

  if (trimmed === undefined || trimmed === null || trimmed === "") {
    return undefined;
  }

  return normalizePhoneNumber(trimmed);
};

const requiredPhone = z.preprocess(
  normalizePhoneInput,
  z.string().regex(PHONE_E164_REGEX, "Enter a valid phone number")
);

const optionalPhone = z.preprocess(
  normalizePhoneInput,
  z.string().regex(PHONE_E164_REGEX, "Enter a valid phone number").optional()
);

const sendOtpSchema = z.object({
  phone: requiredPhone,
  full_name: optionalTrimmed(z.string().min(2)),
});

const verifyOtpSchema = z.object({
  phone: requiredPhone,
  otp: z.string().length(6),
});

const customerRegisterSchema = z.object({
  full_name: requiredTrimmed(z.string().min(2)),
  email: optionalTrimmed(z.string().email()),
  phone: optionalPhone,
  password: optionalTrimmed(z.string().min(8)),
}).refine(
  (data) => data.email || data.phone,
  { message: "Either email or phone is required" }
).refine(
  (data) => {
    if (data.email && !data.password) {
      return false;
    }
    return true;
  },
  { message: "Password is required when using email registration" }
);

const customerLoginSchema = z.object({
  email: requiredTrimmed(z.string().email()),
  password: z.string().min(8),
});

const passwordStrengthSchema = requiredTrimmed(
  z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
      "Password must include uppercase, lowercase, and a number"
    )
);

const resetRoleSchema = optionalTrimmed(
  z.enum(["admin", "customer", "staff", "receptionist", "manager", "housekeeping", "kitchen", "server"])
);

const forgotPasswordSchema = z.object({
  identifier: requiredTrimmed(z.string().min(2).max(120)),
  role: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    resetRoleSchema
  ),
});

const resetPasswordSchema = z.object({
  token: requiredTrimmed(z.string().min(32).max(256)),
  newPassword: passwordStrengthSchema,
  confirmPassword: requiredTrimmed(z.string().min(8)),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  { message: "Passwords do not match", path: ["confirmPassword"] }
);

const customerForgotPasswordSchema = z.object({
  email: requiredTrimmed(z.string().email()),
});

const customerResetPasswordSchema = z.object({
  email: requiredTrimmed(z.string().email()),
  otp: z.string().length(6),
  password: z.string().min(8),
});

const adminLoginSchema = z.object({
  email: requiredTrimmed(z.string().email()),
  password: z.string().min(6),
});

const loginSchema = adminLoginSchema;
const staffLoginSchema = adminLoginSchema;

module.exports = {
  sendOtpSchema,
  verifyOtpSchema,
  customerRegisterSchema,
  customerLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  customerForgotPasswordSchema,
  customerResetPasswordSchema,
  adminLoginSchema,
  loginSchema,
  staffLoginSchema,
};
