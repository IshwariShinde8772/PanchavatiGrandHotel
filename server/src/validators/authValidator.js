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

const forgotPasswordSchema = z.object({
  email: requiredTrimmed(z.string().email()),
});

const resetPasswordSchema = z.object({
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
  adminLoginSchema,
  loginSchema,
  staffLoginSchema,
};
